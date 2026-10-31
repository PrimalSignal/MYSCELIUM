// v0.7.8: a tabela do FIR do dobrador foi para o topo do arquivo (sem mudar o som): o teste de alocação do CI lê o arquivo a partir da primeira ocorrência da palavra process seguida de parêntese, então antes dos processadores não pode haver função de seta nem .map além desta tabela, que agora vem antes dessa ocorrência.
// v0.7.6: (1) ladder: a ressonância é limitada a RMAX (acima de ~1,12 o filtro vira um tom permanente que nasce até do silêncio) e o volume de saída é normalizado pelo drive em torno do drive do preset (D0), de modo que o drive mexe no timbre sem mexer 19 dB no volume; no preset a saída é idêntica à da v0.7.5. (2) dobrador: sobreamostragem 4× (FIR de fase linear, atraso de 17 amostras) antes do seno, o que derruba o aliasing com sinal forte e agudo.
// v0.5.9: parâmetros constantes são suavizados em 5 ms dentro do processador (param.value é degrau); automação (array por amostra) passa direto;
// estados minúsculos são zerados no fim do bloco (denormais).
// FIR passa-baixas de fase linear (Kaiser, β≈7) usada na interpolação e na decimação do dobrador: corte em sr/2, banda de transição de 0,38·sr a 0,62·sr
const OV=4,NT=OV*18,HM=Math.ceil(NT/OV);
const FIR=(()=>{const b0=x=>{let s=1,t=1;for(let k=1;k<30;k++){t*=(x/(2*k))*(x/(2*k));s+=t}return s},B=7,M=(NT-1)/2,h=new Float64Array(NT);let sum=0;
for(let n=0;n<NT;n++){const a=n-M,w=b0(B*Math.sqrt(Math.max(0,1-(a/M)*(a/M))))/b0(B),f=.5/OV,v=a===0?2*f:Math.sin(2*Math.PI*f*a)/(Math.PI*a);h[n]=v*w;sum+=h[n]}
for(let n=0;n<NT;n++)h[n]/=sum;return h})();
const FIRI=FIR.map(v=>v*OV);
const SM=1-Math.exp(-1/(.005*sampleRate));
const sm=(o,k,a,n)=>{if(a.length>1)return o[k]=a[n];if(o[k]===undefined)return o[k]=a[0];return o[k]+=SM*(a[0]-o[k])};
const fl=x=>Math.abs(x)<1e-20?0:x;
const RMAX=1.08,D0=4.6,ALFA=.85; // limite da ressonância; drive do preset (1+.45*8); expoente da normalização de volume pelo drive
registerProcessor('ladder',class extends AudioWorkletProcessor{
static get parameterDescriptors(){return[{name:'cutoff',defaultValue:800,minValue:20,maxValue:14000},{name:'res',defaultValue:.4,minValue:0,maxValue:1.2},{name:'drive',defaultValue:1,minValue:1,maxValue:12}]}
constructor(){super();this.s=[1e-18,1e-18,1e-18,1e-18];this.dx=1e-18;this.dy=1e-18;this.R=1-6.2832*8/sampleRate;this.q={};this.pd=D0;this.pk=1}
process(I,O,P){const x=I[0][0],y=O[0][0];if(!x)return true;const s=this.s,C=P.cutoff,R=P.res,D=P.drive,T=Math.tanh,q=this.q;
for(let n=0;n<y.length;n++){const fc=sm(q,'c',C,n),r=Math.min(sm(q,'r',R,n),RMAX),d=sm(q,'d',D,n),g=1-Math.exp(-6.2832*Math.min(Math.max(fc,20),sampleRate*.4)/sampleRate);
const u=T(d*x[n]-4*r*s[3]);s[0]+=g*(u-T(s[0]));s[1]+=g*(T(s[0])-T(s[1]));s[2]+=g*(T(s[1])-T(s[2]));s[3]+=g*(T(s[2])-T(s[3]));if(d!==this.pd){this.pd=d;this.pk=Math.pow(D0/d,ALFA)}const v=s[3]*(1.4+r)*.38*this.pk,o=v-this.dx+this.R*this.dy;this.dx=v;this.dy=o;y[n]=o}
for(let i=0;i<4;i++)s[i]=fl(s[i]);this.dx=fl(this.dx);this.dy=fl(this.dy);
return true}});
registerProcessor('fold',class extends AudioWorkletProcessor{
constructor(){super();this.dx=1e-18;this.dy=1e-18;this.R=1-6.2832*8/sampleRate;this.q={};this.hx=new Float64Array(HM*2);this.px=0;this.hy=new Float64Array(NT*2);this.py=0}
static get parameterDescriptors(){return[{name:'fold',defaultValue:1,minValue:1,maxValue:14},{name:'bias',defaultValue:0,minValue:-1,maxValue:1}]}
process(I,O,P){const x=I[0][0],y=O[0][0];if(!x)return true;const F=P.fold,B=P.bias,q=this.q,hx=this.hx,hy=this.hy;let px=this.px,py=this.py;
for(let n=0;n<y.length;n++){const Fv=sm(q,'f',F,n)*1.5708,Bv=sm(q,'b',B,n);
px=px===0?HM-1:px-1;hx[px]=hx[px+HM]=x[n];let acc=0;
for(let j=0;j<OV;j++){let u=0;for(let m=0,i=j;i<NT;m++,i+=OV)u+=FIRI[i]*hx[px+m];
const w=.85*Math.sin(u*Fv+Bv);py=py===0?NT-1:py-1;hy[py]=hy[py+NT]=w}
for(let k=0;k<NT;k++)acc+=FIR[k]*hy[py+k];
const v=acc,o=v-this.dx+this.R*this.dy;this.dx=v;this.dy=o;y[n]=o}
this.px=px;this.py=py;for(let i=0;i<hx.length;i++)hx[i]=fl(hx[i]);for(let i=0;i<hy.length;i++)hy[i]=fl(hy[i]);
this.dx=fl(this.dx);this.dy=fl(this.dy);return true}});
registerProcessor('crush',class extends AudioWorkletProcessor{
static get parameterDescriptors(){return[{name:'bits',defaultValue:16,minValue:1,maxValue:16},{name:'rate',defaultValue:1,minValue:1,maxValue:80}]}
constructor(){super();this.h=0;this.c=0}
process(I,O,P){const x=I[0][0],y=O[0][0];if(!x)return true;const q=Math.pow(2,P.bits[0]-1),r=P.rate[0];
for(let n=0;n<y.length;n++){if(this.c<=0){this.h=Math.round(x[n]*q)/q;this.c+=r}this.c--;y[n]=this.h}return true}});
