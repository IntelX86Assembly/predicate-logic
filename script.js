const OPS=["AND","OR","XOR","NOR","NAND","XNOR"];
const els={a:document.getElementById("cubeA"),b:document.getElementById("cubeB"),r:document.getElementById("cubeResult"),msg:document.getElementById("message"),score:document.getElementById("score"),next:document.getElementById("nextButton"),buttons:[...document.querySelectorAll("[data-op]")]};
let game={score:0,a:[],b:[],result:[],operation:null};

function randomBit(){return Math.random()<.5?0:1}
function randomGrid(){return Array.from({length:27},randomBit)}
function gate(a,b,op){
  if(op==="AND")return a&b;if(op==="OR")return a|b;if(op==="XOR")return a^b;
  if(op==="NOR")return Number(!(a|b));if(op==="NAND")return Number(!(a&b));
  return Number(!(a^b));
}

function renderCube(el,data){
  el.innerHTML="";
  const size=56;
  data.forEach((value,index)=>{
    const x=index%3,y=Math.floor(index/3)%3,z=Math.floor(index/9);
    const voxel=document.createElement("div");
    voxel.className="voxel "+(value?"filled":"empty");
    voxel.style.transform=`translate3d(${(x-1)*size}px,${(y-1)*size}px,${(z-1)*size}px)`;
    ["front","back","right","left","top","bottom"].forEach(n=>{
      const face=document.createElement("div");face.className=`face ${n}`;voxel.appendChild(face);
    });
    if(value){
      const sphere=document.createElement("div");sphere.className="sphere";voxel.appendChild(sphere);
    }
    el.appendChild(voxel);
  });
}

function newRound(){
  game.a=randomGrid();game.b=randomGrid();
  game.operation=OPS[Math.floor(Math.random()*OPS.length)];
  game.result=game.a.map((v,i)=>gate(v,game.b[i],game.operation));
  renderCube(els.a,game.a);renderCube(els.b,game.b);renderCube(els.r,game.result);
  els.msg.textContent="Which binary operation produced the result?";
  els.next.classList.add("hidden");
  els.buttons.forEach(b=>{b.disabled=false;b.classList.remove("correct","wrong")});
}
function choose(op){
  const b=document.querySelector(`[data-op="${op}"]`);
  if(op===game.operation){
    game.score++;els.score.textContent=`Score: ${game.score}`;els.msg.textContent=`Correct — ${op}!`;
    b.classList.add("correct");els.buttons.forEach(x=>x.disabled=true);els.next.classList.remove("hidden");
  }else{els.msg.textContent="Incorrect — try another operation.";b.classList.add("wrong");b.disabled=true}
}
els.buttons.forEach(b=>b.addEventListener("click",()=>choose(b.dataset.op)));
els.next.addEventListener("click",newRound);
newRound();
