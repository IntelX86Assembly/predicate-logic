import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const OPS=["AND","OR","XOR","NOR","NAND","XNOR"];
const scoreEl=document.querySelector("#score strong");
const message=document.querySelector("#message");
const nextButton=document.querySelector("#nextButton");
const buttons=[...document.querySelectorAll("[data-op]")];

let score=0;
let game={a:[],b:[],result:[],operation:null};

const scenes=[];
const PALETTE={
  blue:{main:0x31d3ff,light:0xb9f3ff,dark:0x087ca8},
  yellow:{main:0xffdf2e,light:0xfff7a4,dark:0xc59600},
  red:{main:0xff4d69,light:0xffa5b2,dark:0xb51d3b}
};

function gate(a,b,op){
  if(op==="AND")return a&b;
  if(op==="OR")return a|b;
  if(op==="XOR")return a^b;
  if(op==="NOR")return Number(!(a|b));
  if(op==="NAND")return Number(!(a&b));
  return Number(!(a^b));
}
function randomGrid(){return Array.from({length:27},()=>Math.random()<.5?0:1)}

function makeRenderer(stage){
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(34,1,.1,100);
  camera.position.set(5.4,4.5,7.2);
  camera.lookAt(0,0,0);

  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setSize(stage.clientWidth,stage.clientHeight,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.15;
  stage.appendChild(renderer.domElement);

  const ambient=new THREE.HemisphereLight(0xbfdcff,0x07101b,1.5);
  scene.add(ambient);
  const key=new THREE.DirectionalLight(0xffffff,4.2);key.position.set(-4,7,8);scene.add(key);
  const rim=new THREE.DirectionalLight(0x70cfff,2.0);rim.position.set(6,1,-5);scene.add(rim);

  const root=new THREE.Group();root.rotation.y=-0.48;root.rotation.x=0.18;scene.add(root);
  scenes.push({scene,camera,renderer,root,stage});

  return scenes.at(-1);
}

function addCubeShell(root,color){
  // A real 3D wireframe lattice: 3x3x3 cells, not a flat grid.
  const mat=new THREE.LineBasicMaterial({color,transparent:true,opacity:.42});
  const edgeGeo=new THREE.EdgesGeometry(new THREE.BoxGeometry(1,1,1));
  for(let z=-1;z<=1;z++)for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++){
    const cell=new THREE.LineSegments(edgeGeo,mat);
    cell.position.set(x,y,z);
    root.add(cell);
  }
}

function addSphere(root,index,palette){
  const x=index%3-1,y=Math.floor(index/3)%3-1,z=Math.floor(index/9)-1;

  // This is an actual THREE.SphereGeometry mesh with 32x20 segments.
  // Unlike a CSS circle, it has real 3D curvature and responds to lights.
  const geo=new THREE.SphereGeometry(.34,32,20);
  const mat=new THREE.MeshPhysicalMaterial({
    color:palette.main,
    roughness:.22,
    metalness:.02,
    clearcoat:1,
    clearcoatRoughness:.12
  });
  const sphere=new THREE.Mesh(geo,mat);
  sphere.position.set(x,y,z);
  sphere.castShadow=false;
  root.add(sphere);

  // Tiny emissive halo behind each sphere for the neon reference look.
  const haloMat=new THREE.SpriteMaterial({
    color:palette.main,transparent:true,opacity:.11,depthWrite:false,
    blending:THREE.AdditiveBlending
  });
  const halo=new THREE.Sprite(haloMat);
  halo.scale.set(.9,.9,.9);
  halo.position.set(x,y,z);
  root.add(halo);
}

function buildScene(stage,data,kind){
  const s=makeRenderer(stage);
  const p=PALETTE[kind];
  addCubeShell(s.root,p.main);
  data.forEach((v,i)=>{if(v)addSphere(s.root,i,p)});
  return s;
}

function renderAll(){
  scenes.forEach(s=>{s.renderer.render(s.scene,s.camera)});
}

function resize(){
  scenes.forEach(s=>{
    const w=s.stage.clientWidth,h=s.stage.clientHeight;
    s.camera.aspect=w/h;s.camera.updateProjectionMatrix();
    s.renderer.setSize(w,h,false);
  });
  renderAll();
}

function clearScenes(){
  while(scenes.length){
    const s=scenes.pop();
    s.renderer.dispose();
    s.stage.innerHTML="";
  }
}

function newRound(){
  clearScenes();
  game.a=randomGrid();
  game.b=randomGrid();
  game.operation=OPS[Math.floor(Math.random()*OPS.length)];
  game.result=game.a.map((v,i)=>gate(v,game.b[i],game.operation));

  buildScene(document.getElementById("stageA"),game.a,"blue");
  buildScene(document.getElementById("stageB"),game.b,"yellow");
  buildScene(document.getElementById("stageR"),game.result,"red");

  message.textContent="";
  nextButton.classList.add("hidden");
  buttons.forEach(b=>{b.disabled=false;b.classList.remove("correct","wrong")});
  resize();
}

function choose(op){
  const button=document.querySelector(`[data-op="${op}"]`);
  if(op===game.operation){
    score++;
    scoreEl.textContent=score;
    message.textContent=`Correct — ${op}`;
    button.classList.add("correct");
    buttons.forEach(b=>b.disabled=true);
    nextButton.classList.remove("hidden");
  }else{
    message.textContent="Incorrect — try another operation.";
    button.classList.add("wrong");
    button.disabled=true;
  }
}

buttons.forEach(b=>b.addEventListener("click",()=>choose(b.dataset.op)));
nextButton.addEventListener("click",newRound);
window.addEventListener("resize",resize);

newRound();
