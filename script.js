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

/*
  True isometric renderer:
  Every one of the 27 positions is a cube in 3D space.
  Instead of relying on a browser's perspective transform,
  each cube is explicitly projected into an isometric drawing:
    - top face
    - left face
    - right face
  This makes the X, Y and Z dimensions visually obvious
  even on browsers that render CSS 3D inconsistently.
*/
const NS="http://www.w3.org/2000/svg";
const ORIGIN={x:260,y:275};
const CELL={x:62,y:34,z:55};

function svgEl(tag,attrs={}){
  const el=document.createElementNS(NS,tag);
  for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);
  return el;
}

function project(x,y,z){
  return {
    x:ORIGIN.x+(x-y)*CELL.x/2,
    y:ORIGIN.y+(x+y)*CELL.y/2-z*CELL.z
  };
}

function polygon(points,attrs){
  const p=svgEl("polygon",{points:points.map(q=>`${q.x},${q.y}`).join(" "),...attrs});
  return p;
}

function cubeGeometry(x,y,z){
  /*
    Coordinates describe the lower/front-left corner.
    Each cell is a real 3D cube, projected to an isometric view.
  */
  const p000=project(x,y,z);
  const p100=project(x+1,y,z);
  const p010=project(x,y+1,z);
  const p110=project(x+1,y+1,z);
  const p001=project(x,y,z+1);
  const p101=project(x+1,y,z+1);
  const p011=project(x,y+1,z+1);
  const p111=project(x+1,y+1,z+1);

  return {
    top:[p001,p101,p111,p011],
    left:[p001,p011,p010,p000],
    right:[p101,p111,p110,p100],
    bottom:[p000,p100,p110,p010]
  };
}

function colorsFor(type){
  if(type==="blue")return {top:"#b8eaff",left:"#67bce8",right:"#4298c9",edge:"#d7f5ff",glow:"#71d6ff"};
  if(type==="yellow")return {top:"#fff8b9",left:"#e7ce64",right:"#c5a936",edge:"#fffbd6",glow:"#ffe86c"};
  return {top:"#ffbec7",left:"#e87988",right:"#c94d60",edge:"#ffe0e4",glow:"#ff7d91"};
}

function renderCube(svg,data,type){
  svg.innerHTML="";
  const c=colorsFor(type);

  const defs=svgEl("defs");
  const grad=svgEl("radialGradient",{id:`sphere-${type}`});
  grad.appendChild(svgEl("stop",{offset:"0%","stop-color":"#ffffff","stop-opacity":".9"}));
  grad.appendChild(svgEl("stop",{offset:"25%","stop-color":c.glow}));
  grad.appendChild(svgEl("stop",{offset:"100%","stop-color":type==="blue"?"#43aee0":type==="yellow"?"#e5c63f":"#e55d70"}));
  defs.appendChild(grad);

  const filter=svgEl("filter",{id:`shadow-${type}`,x:"-50%",y:"-50%",width:"200%",height:"200%"});
  filter.appendChild(svgEl("feGaussianBlur",{stdDeviation:"5"}));
  defs.appendChild(filter);
  svg.appendChild(defs);

  /*
    Back-to-front painter's order. z first, then y, then x,
    so nearer voxels naturally overlap farther voxels.
  */
  const cells=[];
  for(let z=0;z<3;z++){
    for(let y=0;y<3;y++){
      for(let x=0;x<3;x++){
        const index=x+y*3+z*9;
        cells.push({x,y,z,value:data[index]});
      }
    }
  }

  cells.sort((a,b)=>
    (a.z+a.x+a.y)-(b.z+b.x+b.y) ||
    a.z-b.z || a.y-b.y || a.x-b.x
  );

  for(const cell of cells){
    const g=svgEl("g");
    const geo=cubeGeometry(cell.x,cell.y,cell.z);

    /*
      Every cell has three visible faces. This is the key
      difference from a flat grid: depth is encoded in the
      geometry itself, not merely by rotating the whole image.
    */
    g.appendChild(polygon(geo.left,{
      fill:cell.value?"#163248":"#101725",
      "fill-opacity":cell.value?".92":".65",
      stroke:"#506078","stroke-width":"1.2"
    }));
    g.appendChild(polygon(geo.right,{
      fill:cell.value?"#11283a":"#0d1320",
      "fill-opacity":cell.value?".95":".65",
      stroke:"#46566e","stroke-width":"1.2"
    }));
    g.appendChild(polygon(geo.top,{
      fill:cell.value?"#244b62":"#182233",
      "fill-opacity":cell.value?".95":".72",
      stroke:"#65768e","stroke-width":"1.2"
    }));

    /*
      Occupied cells get a spherical object positioned
      inside the 3D cell, with an ellipse for its contact
      shadow and a radial highlight.
    */
    if(cell.value){
      const center=project(cell.x+.5,cell.y+.5,cell.z+.58);
      const shadow=svgEl("ellipse",{
        cx:center.x+5,cy:center.y+10,rx:16,ry:7,
        fill:"#000","opacity":".38"
      });
      g.appendChild(shadow);

      const sphere=svgEl("circle",{
        cx:center.x,cy:center.y, r:18,
        fill:`url(#sphere-${type})`,
        stroke:c.edge,"stroke-width":"1.2",
        filter:`url(#shadow-${type})`
      });
      g.appendChild(sphere);

      const highlight=svgEl("ellipse",{
        cx:center.x-6,cy:center.y-7,rx:5,ry:3,
        fill:"#fff","opacity":".65"
      });
      g.appendChild(highlight);
    }

    svg.appendChild(g);
  }
}

function randomBit(){return Math.random()<.5?0:1}
function randomGrid(){return Array.from({length:27},randomBit)}

function gate(a,b,op){
  if(op==="AND")return a&b;
  if(op==="OR")return a|b;
  if(op==="XOR")return a^b;
  if(op==="NOR")return Number(!(a|b));
  if(op==="NAND")return Number(!(a&b));
  if(op==="XNOR")return Number(!(a^b));
}

function newRound(){
  game.a=randomGrid();
  game.b=randomGrid();
  game.operation=OPS[Math.floor(Math.random()*OPS.length)];
  game.result=game.a.map((v,i)=>gate(v,game.b[i],game.operation));

  renderCube(els.a,game.a,"blue");
  renderCube(els.b,game.b,"yellow");
  renderCube(els.r,game.result,"red");

  els.msg.textContent="Which binary operation produced the result?";
  els.next.classList.add("hidden");
  els.buttons.forEach(b=>{b.disabled=false;b.classList.remove("correct","wrong")});
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

els.buttons.forEach(b=>b.addEventListener("click",()=>choose(b.dataset.op)));
els.next.addEventListener("click",newRound);
newRound();
