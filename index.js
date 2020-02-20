new Vue({
  el: '#app',
  computed: {
    boxes: function(){
      const lines = this.inputText.split('\n')
      const boxStrings = lines.filter(s=> s.split(',').length >= 5);
      return boxStrings.map(s=> {
        let x, y, xLength, yLength, text, rotateAngle;
        [x, y, xLength, yLength, text, rotateAngle] = s.split(',');
        return new Box(x, y, xLength, yLength, text, rotateAngle, null);
      });
    },
  },
  data: {
    inputText: inputText,
  },
  methods:{
    downloadSvg(){
      const svg = document.querySelector("svg");
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      canvas.width = svg.width.baseVal.value;
      canvas.height = svg.height.baseVal.value;
      const ctx = canvas.getContext("2d");
      const image = new Image;
      image.onload = function(){
          ctx.drawImage( image, 0, 0 );
          const a = document.createElement("a");
          a.href = canvas.toDataURL("image/png");
          a.setAttribute("download", "offce-layout.png");
          a.click();
      }
      image.src = "data:image/svg+xml;charset=utf-8;base64," + btoa(unescape(encodeURIComponent(svgData)));
    },
  }
})
