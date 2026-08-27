const OPS=["AND","OR","XOR","NOR","NAND","XNOR"];

const els={
  a:document.getElementById("cubeA"),
  b:document.getElementById("cubeB"),
  r:document.getElementById("cubeResult"),
  msg:document.getElementById("message"),
  score:document.getElementById("score"),
  next:document.getElementById("nextButton"),
  buttons:[...document.querySelectorAll("[data-op]")]
};

let game={score:0,a:[],b:[],result:[],operation:null};

function randomBit(){
  return Math.random()<0.5?0:1;
}

function randomGrid(){
  return Array.from({length:27},randomBit);
}

function gate(a,b,op){
  switch(op){
    case "AND":return a&b;
    case "OR":return a|b;
    case "XOR":return a^b;
    case "NOR":return Number(!(a|b));
    case "NAND":return Number(!(a&b));
    case "XNOR":return Number(!(a^b));
  }
}

/*
  Creates a genuine 3-dimensional 3x3x3 lattice.
  x, y and z each run from 0 to 2. Every occupied
  position gets a sphere inside an actual little cube.
*/
function renderCube(element,data){
  element.innerHTML="";

  const size=56;

  data.forEach((value,index)=>{
    const x=index%3;
    const y=Math.floor(index/3)%3;
    const z=Math.floor(index/9);

    const voxel=document.createElement("div");
    voxel.className="voxel "+(value?"filled":"empty");

    /*
      Center the complete 3x3x3 volume around the
      cube's origin. The Z translation creates actual
      depth rather than a flat 2D grid.
    */
    const tx=(x-1)*size;
    const ty=(y-1)*size;
    const tz=(z-1)*size;

    voxel.style.transform=`translate3d(${tx}px,${ty}px,${tz}px)`;

    ["front","back","right","left","top","bottom"].forEach(name=>{
      const face=document.createElement("div");
      face.className=`face ${name}`;
      voxel.appendChild(face);
    });

    if(value){
      const sphere=document.createElement("div");
      sphere.className="sphere";
      voxel.appendChild(sphere);
    }

    element.appendChild(voxel);
  });
}

function newRound(){
  game.a=randomGrid();
  game.b=randomGrid();
  game.operation=OPS[Math.floor(Math.random()*OPS.length)];

  game.result=game.a.map((value,i)=>
    gate(value,game.b[i],game.operation)
  );

  renderCube(els.a,game.a);
  renderCube(els.b,game.b);
  renderCube(els.r,game.result);

  els.msg.textContent="Which binary operation produced the result?";
  els.next.classList.add("hidden");

  els.buttons.forEach(button=>{
    button.disabled=false;
    button.classList.remove("correct","wrong");
  });
}

function choose(op){
  const button=document.querySelector(`[data-op="${op}"]`);

  if(op===game.operation){
    game.score++;
    els.score.textContent=`Score: ${game.score}`;
    els.msg.textContent=`Correct — ${op}!`;
    button.classList.add("correct");

    els.buttons.forEach(b=>b.disabled=true);
    els.next.classList.remove("hidden");
  }else{
    els.msg.textContent="Incorrect — try another operation.";
    button.classList.add("wrong");
    button.disabled=true;
  }
}

els.buttons.forEach(button=>{
  button.addEventListener("click",()=>choose(button.dataset.op));
});

els.next.addEventListener("click",newRound);

newRound();
