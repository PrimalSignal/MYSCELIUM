// v0.5.9: parâmetros constantes são suavizados em 5 ms dentro do processador (param.value é degrau); automação (array por amostra) passa direto;
// estados minúsculos são zerados no fim do bloco (denormais).
const SM=1-Math.exp(-1/(.005*sampleRate));
const sm=(o,k,a,n)=>{if(a.length>1)return o[k]=a[n];if(o[k]===undefined)return o[k]=a[0];return o[k]+=SM*(a[0]-o[k])};
const fl=x=>Math.abs(x)<1e-20?0:x;
registerProcessor('ladder',class extends AudioWorkletProcessor{
static get parameterDescriptors(){return[{name:'cutoff',defaultValue:800,minValue:20,maxValue:14000},{name:'res',defaultValue:.4,minValue:0,maxValue:1.2},{name:'drive',defaultValue:1,minValue:1,maxValue:12}]}
constructor(){super();this.s=[1e-18,1e-18,1e-18,1e-18];this.dx=1e-18;this.dy=1e-18;this.R=1-6.2832*8/sampleRate;this.q={}}
process(I,O,P){const x=I[0][0],y=O[0][0];if(!x)return true;const s=this.s,C=P.cutoff,R=P.res,D=P.drive,T=Math.tanh,q=this.q;
for(let n=0;n<y.length;n++){const fc=sm(q,'c',C,n),r=sm(q,'r',R,n),d=sm(q,'d',D,n),g=1-Math.exp(-6.2832*Math.min(Math.max(fc,20),sampleRate*.4)/sampleRate);
const u=T(d*x[n]-4*r*s[3]);s[0]+=g*(u-T(s[0]));s[1]+=g*(T(s[0])-T(s[1]));s[2]+=g*(T(s[1])-T(s[2]));s[3]+=g*(T(s[2])-T(s[3]));const v=s[3]*(1.4+r)*.38,o=v-this.dx+this.R*this.dy;this.dx=v;this.dy=o;y[n]=o}
for(let i=0;i<4;i++)s[i]=fl(s[i]);this.dx=fl(this.dx);this.dy=fl(this.dy);
return true}});
registerProcessor('fold',class extends AudioWorkletProcessor{
constructor(){super();this.dx=1e-18;this.dy=1e-18;this.R=1-6.2832*8/sampleRate;this.q={}}
static get parameterDescriptors(){return[{name:'fold',defaultValue:1,minValue:1,maxValue:14},{name:'bias',defaultValue:0,minValue:-1,maxValue:1}]}
process(I,O,P){const x=I[0][0],y=O[0][0];if(!x)return true;const F=P.fold,B=P.bias,q=this.q;
for(let n=0;n<y.length;n++){const v=.85*Math.sin(x[n]*sm(q,'f',F,n)*1.5708+sm(q,'b',B,n)),o=v-this.dx+this.R*this.dy;this.dx=v;this.dy=o;y[n]=o}
this.dx=fl(this.dx);this.dy=fl(this.dy);return true}});
registerProcessor('crush',class extends AudioWorkletProcessor{
static get parameterDescriptors(){return[{name:'bits',defaultValue:16,minValue:1,maxValue:16},{name:'rate',defaultValue:1,minValue:1,maxValue:80}]}
constructor(){super();this.h=0;this.c=0}
process(I,O,P){const x=I[0][0],y=O[0][0];if(!x)return true;const q=Math.pow(2,P.bits[0]-1),r=P.rate[0];
for(let n=0;n<y.length;n++){if(this.c<=0){this.h=Math.round(x[n]*q)/q;this.c+=r}this.c--;y[n]=this.h}return true}});
