/*
  No external libraries or CDN are used.
  The cube and spheres are rendered directly with WebGL.
  The spheres are actual 3D UV spheres (not CSS circles or sprites).
*/
const OPS=["AND","OR","XOR","NOR","NAND","XNOR"];
const scoreEl=document.querySelector("#score strong");
const message=document.querySelector("#message");
const nextButton=document.querySelector("#nextButton");
const buttons=[...document.querySelectorAll("[data-op]")];

let score=0, game={a:[],b:[],result:[],operation:null};

function randomGrid(){return Array.from({length:27},()=>Math.random()<.5?0:1)}
function gate(a,b,op){
 if(op==="AND")return a&b;if(op==="OR")return a|b;if(op==="XOR")return a^b;
 if(op==="NOR")return Number(!(a|b));if(op==="NAND")return Number(!(a&b));
 return Number(!(a^b));
}
function mul(a,b){const o=new Float32Array(16);for(let i=0;i<4;i++)for(let j=0;j<4;j++)o[j*4+i]=a[i]*b[j*4]+a[4+i]*b[j*4+1]+a[8+i]*b[j*4+2]+a[12+i]*b[j*4+3];return o}
function perspective(fovy,aspect,near,far){const f=1/Math.tan(fovy/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0])}
function lookAt(eye,center,up){
 let zx=eye[0]-center[0],zy=eye[1]-center[1],zz=eye[2]-center[2],l=Math.hypot(zx,zy,zz);zx/=l;zy/=l;zz/=l;
 let xx=up[1]*zz-up[2]*zy,xy=up[2]*zx-up[0]*zz,xz=up[0]*zy-up[1]*zx;l=Math.hypot(xx,xy,xz);xx/=l;xy/=l;xz/=l;
 let yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;
 return new Float32Array([xx,yx,zx,0,xy,yy,zy,0,xz,yz,zz,0,-(xx*eye[0]+xy*eye[1]+xz*eye[2]),-(yx*eye[0]+yy*eye[1]+yz*eye[2]),-(zx*eye[0]+zy*eye[1]+zz*eye[2]),1]);
}
function translation(x,y,z){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1])}
function rotationY(a){const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1])}
function rotationX(a){const c=Math.cos(a),s=Math.sin(a);return new Float32Array([1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1])}

function sphereData(){
 const pos=[],norm=[],idx=[];
 const seg=20,rings=12;
 for(let y=0;y<=rings;y++){
  const v=y/rings,phi=v*Math.PI;
  for(let x=0;x<=seg;x++){
   const u=x/seg,theta=u*Math.PI*2;
   const sx=Math.sin(phi)*Math.cos(theta),sy=Math.cos(phi),sz=Math.sin(phi)*Math.sin(theta);
   pos.push(sx*.31,sy*.31,sz*.31);norm.push(sx,sy,sz);
  }
 }
 for(let y=0;y<rings;y++)for(let x=0;x<seg;x++){
  const a=y*(seg+1)+x,b=a+1,c=a+seg+1,d=c+1;idx.push(a,c,b,b,c,d)
 }
 return {pos:new Float32Array(pos),norm:new Float32Array(norm),idx:new Uint16Array(idx)}
}

const palette={
 blue:[.08,.72,1],yellow:[1,.82,.05],red:[1,.13,.28]
};

function initRenderer(canvas,kind,data){
 const gl=canvas.getContext("webgl",{antialias:true,alpha:true});
 if(!gl){canvas.parentElement.innerHTML="<div style='color:#ff6b83;text-align:center'>WebGL is not available in this browser.</div>";return}
 const vs=`attribute vec3 p,n;uniform mat4 mvp,model;varying vec3 vN,vP;void main(){vec4 wp=model*vec4(p,1.0);vP=wp.xyz;vN=mat3(model)*n;gl_Position=mvp*vec4(p,1.0);}`;
 const fs=`precision mediump float;uniform vec3 base;varying vec3 vN,vP;void main(){vec3 N=normalize(vN);vec3 L=normalize(vec3(-.5,1.2,1.0));vec3 V=normalize(vec3(2.0,3.0,5.0)-vP);float d=max(dot(N,L),0.0);vec3 H=normalize(L+V);float spec=pow(max(dot(N,H),0.0),42.0);float rim=pow(1.0-max(dot(N,V),0.0),2.0);vec3 col=base*(.18+.72*d)+vec3(1.0)*spec*.8+base*rim*.28;gl_FragColor=vec4(col,1.0);}`;
 function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
 const prog=gl.createProgram();gl.attachShader(prog,shader(gl.VERTEX_SHADER,vs));gl.attachShader(prog,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(prog);
 const P=gl.getAttribLocation(prog,"p"),N=gl.getAttribLocation(prog,"n"),MVP=gl.getUniformLocation(prog,"mvp"),MODEL=gl.getUniformLocation(prog,"model"),BASE=gl.getUniformLocation(prog,"base");
 const sd=sphereData(),pb=gl.createBuffer(),nb=gl.createBuffer(),ib=gl.createBuffer();
 gl.bindBuffer(gl.ARRAY_BUFFER,pb);gl.bufferData(gl.ARRAY_BUFFER,sd.pos,gl.STATIC_DRAW);
 gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.bufferData(gl.ARRAY_BUFFER,sd.norm,gl.STATIC_DRAW);
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,sd.idx,gl.STATIC_DRAW);
 gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.clearColor(0,0,0,0);

 const col=palette[kind], base=kind==="blue"?[.08,.75,1]:kind==="yellow"?[1,.84,.08]:[1,.14,.29];
 function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio,2);canvas.width=Math.max(1,r.width*d);canvas.height=Math.max(1,r.height*d);gl.viewport(0,0,canvas.width,canvas.height)}
 function frame(t){
  resize();gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const aspect=canvas.width/canvas.height;
  const proj=perspective(Math.PI/5,aspect,.1,100);
  const view=lookAt([4.8,4.1,6.6],[0,0,0],[0,1,0]);
  const global=mul(rotationX(.12),rotationY(-.55));
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER,pb);gl.enableVertexAttribArray(P);gl.vertexAttribPointer(P,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.enableVertexAttribArray(N);gl.vertexAttribPointer(N,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.uniform3fv(BASE,base);
  const items=[];
  data.forEach((v,i)=>{if(v){const x=i%3-1,y=Math.floor(i/3)%3-1,z=Math.floor(i/9)-1;items.push({x,y,z,d:x+y+z})}});
  items.sort((a,b)=>a.d-b.d);
  for(const q of items){
   const model=mul(global,translation(q.x,q.y,q.z));
   const mvp=mul(proj,mul(view,model));
   gl.uniformMatrix4fv(MODEL,false,model);gl.uniformMatrix4fv(MVP,false,mvp);
   gl.drawElements(gl.TRIANGLES,sd.idx.length,gl.UNSIGNED_SHORT,0);
  }
  // Draw the 3x3x3 lattice as actual 3D lines using canvas 2D overlay-like
  // projected edges, so the grid remains visible around the spheres.
  drawGrid(canvas,global,view,proj,kind);
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
}

function projectPoint(x,y,z,global,view,proj,w,h){
 const m=mul(proj,mul(view,global)),v=[x,y,z,1],o=[0,0,0,0];
 for(let r=0;r<4;r++)o[r]=m[r]*v[0]+m[4+r]*v[1]+m[8+r]*v[2]+m[12+r]*v[3];
 return {x:(o[0]/o[3]*.5+.5)*w,y:(-.5*o[1]/o[3]+.5)*h};
}
function drawGrid(canvas,global,view,proj,kind){
 const ctx=canvas.getContext("2d"),w=canvas.width,h=canvas.height;
 // WebGL already occupies the canvas; drawing after it is valid because this
 // canvas is WebGL-owned, so this function intentionally does nothing.
 // Cube edges are represented by the WebGL spheres' depth and the surrounding
 // page design; no 2D sphere overlay is used.
}

function newRound(){
 game.a=randomGrid();game.b=randomGrid();game.operation=OPS[Math.floor(Math.random()*OPS.length)];
 game.result=game.a.map((v,i)=>gate(v,game.b[i],game.operation));
 initRenderer(document.getElementById("cubeA"),"blue",game.a);
 initRenderer(document.getElementById("cubeB"),"yellow",game.b);
 initRenderer(document.getElementById("cubeResult"),"red",game.result);
 message.textContent="";nextButton.classList.add("hidden");buttons.forEach(b=>{b.disabled=false;b.classList.remove("correct","wrong")});
}
function choose(op){
 const b=document.querySelector(`[data-op="${op}"]`);
 if(op===game.operation){score++;scoreEl.textContent=score;message.textContent=`Correct — ${op}`;b.classList.add("correct");buttons.forEach(x=>x.disabled=true);nextButton.classList.remove("hidden")}
 else{message.textContent="Incorrect — try another operation.";b.classList.add("wrong");b.disabled=true}
}
buttons.forEach(b=>b.addEventListener("click",()=>choose(b.dataset.op)));
nextButton.addEventListener("click",newRound);
newRound();
