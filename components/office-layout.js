
class Box{
  constructor(x, y, xLength, yLength, text, rotateAngle, rectFill){
    this.x = x*1;
    this.y = y*1;
    this.xLength = xLength*1;
    this.yLength = yLength*1;
    this.text = text;
    this.rotateAngle = rotateAngle;
    this.rectFill = rectFill || 'white';
  }
  get rectX(){
    return Box.baseSize * (this.x-1);
  }
  get rectY(){
    return Box.baseSize * (this.y-1);
  }
  get rectWidth(){
    return Box.baseSize * this.xLength;
  }
  get rectHeight(){
    return Box.baseSize * this.yLength;
  }
  get textX(){
    return this.rectX + this.rectWidth/2;
  }
  get textY(){
    return this.rectY + this.rectHeight/2;
  }
  get transform(){
    if(this.rotateAngle == null) return '';
    return `rotate(${this.rotateAngle} ${this.textX},${this.textY})`;
  }
  static maxXSize(boxes){
    return Box.maxSize(boxes.map(b=>b.x+(b.xLength-1)));
  }
  static maxYSize(boxes){
    return Box.maxSize(boxes.map(b=>b.y+(b.yLength-1)));
  }
  static maxSize(sizes){
    if(sizes.length === 0) return 0;
    return Math.max(...sizes) || 0;
  }
}
Box.baseSize = 40;

Vue.component('office-layout', {
  props: {
    boxes: Array,
  },
  computed:{
    svgWidth(){
      return Box.maxXSize(this.boxes)*Box.baseSize;
    },
    svgHeight(){
      return Box.maxYSize(this.boxes)*Box.baseSize;
    },
  },
  template: `
<svg :width=svgWidth+1 :height=svgHeight+1>
  <rect x=0 y=0 :width=svgWidth :height=svgHeight fill=white stroke=black stroke-width=1></rect>
  <template v-for="box in boxes">
  <rect :x=box.rectX :y=box.rectY :width=box.rectWidth :height=box.rectHeight :fill=box.rectFill stroke=black stroke-width=1></rect>
  <text :x=box.textX :y=box.textY :transform=box.transform font-family=Meiryo font-size=12 text-anchor="middle" dominant-baseline="central">{{box.text}}</text>
  </template>
</svg>
  `
});
exports.Box = Box;