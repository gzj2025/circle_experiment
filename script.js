// ---------- 全局变量 ----------
const REPO_OWNER = 'gzj2025';
const REPO_NAME = 'circle_experiment';
const GITHUB_TOKEN = '';
let data = {};
let circles = [];
let selected = null;

// ---------- 调试 ----------
function debug(msg){
  console.log(msg);
  const div = document.getElementById('debug');
  if(div){
    div.innerHTML = msg;
    div.style.display = 'block';
    setTimeout(()=>{div.style.display='none'},3000);
  }
}

// ---------- 页面切换 ----------
function switchPage(num){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  const page = document.getElementById(`page${num}`);
  page.classList.add("active");
  window.scrollTo(0,0);

  // 延迟初始化 canvas
  setTimeout(()=>{
    if(num===2) startStage1();
    if(num===3) startStage2();
    if(num===4) startStage3();
  }, 100);
}

// ---------- 页面事件 ----------
document.addEventListener("DOMContentLoaded", async ()=>{
  await syncPendingSubmissions();

  // 开始实验
  document.getElementById("startBtn").onclick = async ()=>{
    data.name = document.getElementById("name").value;
    data.age = document.getElementById("age").value;
    data.alipayAccount = document.getElementById("alipayAccount").value;
    data.alipayName = document.getElementById("alipayName").value;

    debug("开始实验：" + JSON.stringify(data));

    await submitToGitHub({stage:'基本信息提交'});
    switchPage(2);
  };

  // 阶段1下一步
  document.getElementById("next1").onclick = async ()=>{
    data.beforeSelfSize = circles[0].r;
    data.afterSelfSize = circles[1].r;
    await submitToGitHub({stage:'阶段1完成', beforeSelfSize:data.beforeSelfSize, afterSelfSize:data.afterSelfSize});
    switchPage(3);
  };

  // 阶段2下一步
  document.getElementById("next2").onclick = async ()=>{
    data.childSize = circles[1].r;
    await submitToGitHub({stage:'阶段2完成', childSize:data.childSize});
    switchPage(4);
  };

  // 阶段4 完成实验
  document.getElementById("finish").onclick = async ()=>{
    const overlap = document.getElementById("overlapText").textContent.replace('重叠面积：','');
    data.overlapArea = overlap;

    // 提交最终数据
    await submitToGitHub({stage:'实验完成', overlapArea:overlap, finalData:true});

    // 跳转到实验结束页面
    switchPage(5);
  };
});

// ---------- 阶段1 ----------
function startStage1(){
  new p5(p=>{
    p.setup = ()=>{
      let canvas = p.createCanvas(800,500);
      canvas.parent("canvas1");
      circles = [
        new Circle(p,300,250,80,"red","生产前的自己"),
        new Circle(p,500,250,80,"blue","生产后的自己")
      ];
    };
    p.draw = ()=>{
      p.background(255);
      circles.forEach(c=>c.show());
    };
    p.mousePressed = ()=>selectCircle(p);
    p.mouseDragged = ()=>resizeCircle(p);
    p.mouseReleased = ()=>selected=null;
  });
}

// ---------- 阶段2 ----------
function startStage2(){
  new p5(p=>{
    p.setup = ()=>{
      let canvas = p.createCanvas(800,500);
      canvas.parent("canvas2");
      circles = [
        new Circle(p,300,250,data.afterSelfSize,"blue","生产后的自己"),
        new Circle(p,500,250,60,"green","孩子")
      ];
    };
    p.draw = ()=>{
      p.background(255);
      circles.forEach(c=>c.show());
    };
    p.mousePressed = ()=>selectCircle(p);
    p.mouseDragged = ()=>resizeCircle(p);
    p.mouseReleased = ()=>selected=null;
  });
}

// ---------- 阶段3 ----------
function startStage3(){
  new p5(p=>{
    p.setup = ()=>{
      let canvas = p.createCanvas(800,500);
      canvas.parent("canvas3");
      circles = [
        new Circle(p,300,250,data.afterSelfSize,"blue","自己"),
        new Circle(p,500,250,data.childSize,"green","孩子")
      ];
    };
    p.draw = ()=>{
      p.background(255);
      let overlap = intersectionArea(p,circles[0],circles[1]);
      p.fill(120);
      drawOverlap(p,circles[0],circles[1]);
      circles.forEach(c=>c.show());
      document.getElementById("overlapText").textContent = `重叠面积：${overlap.toFixed(2)}`;
    };
    p.mousePressed = ()=>selectCircle(p);
    p.mouseDragged = ()=>moveCircle(p);
    p.mouseReleased = ()=>selected=null;
  });
}

// ---------- Circle 类 ----------
class Circle {
  constructor(p,x,y,r,col,label){this.p=p; this.x=x; this.y=y; this.r=r; this.col=col; this.label=label;}
  show(){
    this.p.noFill();
    this.p.stroke(this.col);
    this.p.strokeWeight(3);
    this.p.ellipse(this.x,this.y,this.r*2);
    this.p.fill(0);
    this.p.noStroke();
    this.p.textAlign(this.p.CENTER);
    this.p.text(this.label,this.x,this.y-this.r-10);
  }
}

// ---------- 通用操作 ----------
function selectCircle(p){
  for(let c of circles) if(p.dist(p.mouseX,p.mouseY,c.x,c.y)<c.r){selected=c; break;}
}
function resizeCircle(p){if(selected){let d=p.dist(p.mouseX,p.mouseY,selected.x,selected.y); selected.r=p.constrain(d,30,200);}}
function moveCircle(p){if(selected){selected.x=p.constrain(p.mouseX,100,700); selected.y=p.constrain(p.mouseY,50,450);}}
function intersectionArea(p,c1,c2){
  let d=p.dist(c1.x,c1.y,c2.x,c2.y);
  if(d>=c1.r+c2.r) return 0;
  if(d<=Math.abs(c1.r-c2.r)) return Math.PI*Math.pow(Math.min(c1.r,c2.r),2);
  let r1=c1.r,r2=c2.r;
  let alpha=Math.acos((d*d+r1*r1-r2*r2)/(2*d*r1))*2;
  let beta=Math.acos((d*d+r2*r2-r1*r1)/(2*d*r2))*2;
  return 0.5*r2*r2*(beta-Math.sin(beta))+0.5*r1*r1*(alpha-Math.sin(alpha));
}
function drawOverlap(p,c1,c2){p.beginShape(); for(let a=0;a<p.TWO_PI;a+=0.01){let x=c1.x+Math.cos(a)*c1.r; let y=c1.y+Math.sin(a)*c1.r; if(p.dist(x,y,c2.x,c2.y)<c2.r) p.vertex(x,y);} p.endShape(p.CLOSE);}

// ---------- GitHub 提交、缓存、同步 ----------
async function submitToGitHub(additionalData={}){ /* 保留原代码 */ }
function saveToLocal(submission){ /* 保留原代码 */ }
async function syncPendingSubmissions(){ /* 保留原代码 */ }
