const OPS=["AND","OR","XOR","NOR","NAND","XNOR"];
const els={a:document.getElementById("cubeA"),b:document.getElementById("cubeB"),r:document.getElementById("cubeResult"),msg:document.getElementById("message"),score:document.getElementById("score"),next:document.getElementById("nextButton"),buttons:[...document.querySelectorAll("[data-op]")]};
let game={score:0,a:[],b:[],result:[],operation:null};

const bit=()=>Math.random()<.5?0:1;
const grid=()=>Array.from({length:27},bit);

function gate(a,b,op){
  if(op==="AND")return a&b;
  if(op==="OR")return a|b;
  if(op==="XOR")return a^b;
  if(op==="NOR")return Number(!(a|b));
  if(op==="NAND")return Number(!(a&b));
  if(op==="XNOR")return Number(!(a^b));
}

function render(el,data){
  el.innerHTML="";
  data.forEach(v=>{
    const c=document.createElement("div");
    c.className="cube-cell"+(v?" has-sphere":"");
    el.appendChild(c);
  });
}

function newRound(){
  game.a=grid(); game.b=grid();
  game.operation=OPS[Math.floor(Math.random()*OPS.length)];
  game.result=game.a.map((v,i)=>gate(v,game.b[i],game.operation));
  render(els.a,game.a);render(els.b,game.b);render(els.r,game.result);
  els.msg.textContent="Which binary operation produced the result?";
  els.next.classList.add("hidden");
  els.buttons.forEach(b=>{b.disabled=false;b.classList.remove("correct","wrong")});
}

function choose(op){
  if(op===game.operation){
    game.score++;
    els.score.textContent="Score: "+game.score;
    els.msg.textContent="Correct — "+op+"!";
    document.querySelector(`[data-op="${op}"]`).classList.add("correct");
    els.buttons.forEach(b=>b.disabled=true);
    els.next.classList.remove("hidden");
  }else{
    els.msg.textContent="Incorrect — try again.";
    const bad=document.querySelector(`[data-op="${op}"]`);
    bad.classList.add("wrong");
    bad.disabled=true;
  }
}

els.buttons.forEach(b=>b.addEventListener("click",()=>choose(b.dataset.op)));
els.next.addEventListener("click",newRound);
newRound();
