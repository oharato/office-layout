Vue.createApp({
  components: { OfficeLayout },
  computed: {
    layout() {
      const boxes = [];
      const errors = [];
      this.inputText.split('\n').forEach((line, index) => {
        if (!line.trim()) return;
        const fields = line.split(',');
        const [x, y, width, height] = fields.slice(0, 4).map(Number);
        const angle = fields[5]?.trim() ? Number(fields[5]) : 0;
        if (fields.length < 5 || fields.length > 6 ||
            ![x, y, width, height].every(n => Number.isFinite(n) && n > 0) ||
            !Number.isFinite(angle) ||
            !Number.isFinite((x + width) * Box.baseSize) ||
            !Number.isFinite((y + height) * Box.baseSize)) {
          errors.push(`${index + 1}行目：座標・サイズは正の数、回転角度は数値で入力してください（5〜6列）。`);
          return;
        }
        boxes.push(new Box(x, y, width, height, fields[4], angle, null));
      });
      return { boxes, errors };
    },
    boxes() { return this.layout.boxes; },
  },
  data() {
    return { inputText: sampleLayoutText, exportError: '', exporting: false };
  },
  methods: {
    resetSample() {
      this.inputText = sampleLayoutText;
      this.exportError = '';
    },
    async downloadSvg() {
      if (this.exporting) return;
      this.exportError = '';
      if (this.layout.errors.length || !this.boxes.length) {
        this.exportError = '有効な座席データを入力し、入力エラーを修正してから保存してください。';
        return;
      }
      const svg = document.querySelector('svg');
      const width = svg.width.baseVal.value;
      const height = svg.height.baseVal.value;
      // Bound both dimensions and allocation before creating a canvas.
      if (![width, height].every(n => Number.isFinite(n) && n > 0 && n <= 8192) ||
          Math.ceil(width) * Math.ceil(height) > 16777216) {
        this.exportError = 'PNGは各辺8192px以内、総画素数16,777,216以内で保存できます。座標やサイズを小さくしてください。';
        return;
      }
      this.exporting = true;
      let svgUrl;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(width);
        canvas.height = Math.ceil(height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas unavailable');
        svgUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' }));
        const image = new Image();
        image.src = svgUrl;
        await image.decode();
        ctx.drawImage(image, 0, 0);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('PNG encoding failed');
        const pngUrl = URL.createObjectURL(blob);
        try {
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = 'office-layout.png';
          link.click();
        } finally {
          setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
        }
      } catch {
        this.exportError = 'PNGの保存に失敗しました。座席表を小さくするか、別のブラウザーでお試しください。';
      } finally {
        if (svgUrl) URL.revokeObjectURL(svgUrl);
        this.exporting = false;
      }
    },
  }
}).mount('#app')
