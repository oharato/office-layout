const inputText = `1,1,1,2,山田
1,3,1,2,鈴木
1,5,1,2,木下
1,7,1,2,竹田

5,1,1,2,木村
5,3,1,2,上田
5,5,1,2,森
5,7,1,2,山内

6,1,1,2,村上
6,3,1,2,
6,5,1,2,
6,7,1,2,

9,1,1,8,荷物置き場

13,1,1,2,
13,3,1,2,
13,5,1,2,
13,7,1,2,

14,1,1,2,
14,3,1,2,
14,5,1,2,
14,7,1,2,

3,10,2,1,
5,10,2,1,
7,10,2,1,
9,10,2,1,
11,10,2,1,
`

new Vue({
  el: '#app',
  computed: {
    boxes: function(){
      const lines = this.inputText.split('\n')
      const boxStrings = lines.filter(s=> s.split(',').length === 5);
      return boxStrings.map(s=> new Box(...s.split(',')));
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
