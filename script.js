const OPS=["AND","OR","XOR","NOR","NAND","XNOR"];
const palettes={
  blue:{main:"#22c9fa",light:"#aaf2ff"},
  yellow:{main:"#ffdd2e",light:"#fff4a0"},
  red:{main:"#ff4562",light:"#ffabb8"}
};
let score=0,game={a:[],b:[],r:[],op:""};

function randomGrid(){return Array.from({length:27},()=>Math.random()<.5?0:1)}
function gate(a,b,op){
 if(op==="AND")return a&b;
 if(op==="OR")return a|b;
 if(op==="XOR")return a^b;
 if(op==="NOR")return +( !(a|b) );
 if(op==="NAND")return +( !(a&b) );
 return +( !(a^b) );
}
function makeCell(x,y,z,value,palette){
 const cell=document.createElement("div");
 cell.className="cell";
 cell.style.transform=`translate3d(${x*60}px,${y*60}px,${z*60}px)`;
 ["front","back","right","left","top","bottom"].forEach(side=>{
   const w=document.createElement("div");w.className="wire "+side;cell.appendChild(w);
 });
 if(value){
   const s=document.createElement("div");s.className="sphere";
   s.style.setProperty("--sphere",palette.main);
   s.style.setProperty("--glow",palette.main+"99");
   cell.appendChild(s);
 }
 return cell;
}
function render(id,data,palette){
 const cube=document.getElementById(id);cube.innerHTML="";
 data.forEach((v,i)=>{
   const x=i%3-1,y=Math.floor(i/3)%3-1,z=Math.floor(i/9)-1;
   cube.appendChild(makeCell(x,y,z,v,palette));
 });
}
function newRound(){
 game.a=randomGrid();game.b=randomGrid();game.op=OPS[Math.floor(Math.random()*OPS.length)];
 game.r=game.a.map((v,i)=>gate(v,game.b[i],game.op));
 render("cubeA",game.a,palettes.blue);render("cubeB",game.b,palettes.yellow);render("cubeR",game.r,palettes.red);
 document.getElementById("message").textContent="";
 document.getElementById("next").classList.add("hidden");
 document.querySelectorAll("[data-op]").forEach(b=>{b.disabled=false;b.classList.remove("correct","wrong")});
}
function choose(op){
 const b=document.querySelector(`[data-op="${op}"]`);
 if(op===game.op){
   score++;document.getElementById("score").textContent=score;
   document.getElementById("message").textContent=`Correct — ${op}`;
   b.classList.add("correct");
   document.querySelectorAll("[data-op]").forEach(x=>x.disabled=true);
   document.getElementById("next").classList.remove("hidden");
 }else{
   document.getElementById("message").textContent="Incorrect — try another operation.";
   b.classList.add("wrong");b.disabled=true;
 }
}
document.querySelectorAll("[data-op]").forEach(b=>b.addEventListener("click",()=>choose(b.dataset.op)));
document.getElementById("next").addEventListener("click",newRound);
newRound();
