export type StoryLayout = "einzel" | "landschaft" | "vorher-nachher";
export type ReviewPosition = "oben-links" | "oben-rechts" | "unten-links" | "unten-rechts";
export interface CropState { zoom:number; x:number; y:number }
export interface StoryPhoto { id:string; file:File; url:string; name:string; layout:StoryLayout; pairId?:string; crop:CropState; title:string; reviewId?:string; reviewPosition:ReviewPosition; reviewOffset:number }
export interface StoryReview { id:string; name:string; text:string; stars:number }
export interface StoryOptions { useReviews:boolean; reviewEnding:boolean; googleEnding:boolean; googleUrl:string }
export const STORY_WIDTH=1080;
export const STORY_HEIGHT=1920;
export const DEFAULT_CROP:CropState={zoom:1,x:0,y:0};

// Maße 1:1 aus der Beispiel-Story (900x1600) hochskaliert auf 1080x1920.
const PHOTO={x:202,y:558,w:678,h:1146,r:26};
const TITLE_BASELINE=1800;
const CARD={w:430,margin:40,radius:22,pad:26,nameBaseline:150,textBaseline:180,lineHeight:30,bottom:20,topY:528};
const GOOGLE_LOGO_URL="/whatsapp-story/google-g.png";
const REVIEW_STAR_URL="/whatsapp-story/review-star.svg";
// Vorlage liegt lokal im Programm, damit die Vorschau auch offline auf dem Pi funktioniert.
export const STORY_TEMPLATE_URL="/whatsapp-story/template.png";
const TEMPLATE_FALLBACK_BG="#0b1f33";

const imageCache=new Map<string,Promise<HTMLImageElement>>();
function loadImage(src:string){let cached=imageCache.get(src);if(!cached){cached=new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error(`Grafik konnte nicht geladen werden: ${src}`));image.src=src;});cached.catch(()=>{if(imageCache.get(src)===cached)imageCache.delete(src);});imageCache.set(src,cached);}return cached;}
async function drawTemplate(ctx:CanvasRenderingContext2D,url:string){
  try{ ctx.drawImage(await loadImage(url),0,0,STORY_WIDTH,STORY_HEIGHT); }
  catch{ ctx.fillStyle=TEMPLATE_FALLBACK_BG; ctx.fillRect(0,0,STORY_WIDTH,STORY_HEIGHT); }
}

let fontsReady:Promise<void>|undefined;
export function ensureStoryFonts(){
  if(!fontsReady){
    const faces=["400 20px Montserrat","700 24px Montserrat","700 48px Montserrat"];
    fontsReady=(async()=>{
      try{ await Promise.all(faces.map(f=>document.fonts.load(f,"Mg"))); await document.fonts.ready; }catch{ /* Fallback-Schrift */ }
    })();
  }
  return fontsReady;
}
const font=(weight:number,size:number)=>`${weight} ${size}px Montserrat, "Helvetica Neue", Arial, sans-serif`;

function clipRounded(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.clip();}
async function drawCover(ctx:CanvasRenderingContext2D,src:string,x:number,y:number,w:number,h:number,crop:CropState,radius=PHOTO.r){
  ctx.save();clipRounded(ctx,x,y,w,h,radius);
  try{const image=await loadImage(src);const base=Math.max(w/image.naturalWidth,h/image.naturalHeight)*crop.zoom;const dw=image.naturalWidth*base,dh=image.naturalHeight*base;ctx.drawImage(image,x+(w-dw)/2+crop.x,y+(h-dh)/2+crop.y,dw,dh);}
  catch{ctx.fillStyle="rgba(255,255,255,.12)";ctx.fillRect(x,y,w,h);}
  ctx.restore();
}

async function drawGoogleG(ctx:CanvasRenderingContext2D,x:number,y:number,size:number){try{ctx.drawImage(await loadImage(GOOGLE_LOGO_URL),x,y,size,size);}catch{/* Logo fehlt — Karte bleibt sichtbar */}}
async function drawStar(ctx:CanvasRenderingContext2D,cx:number,cy:number,size:number){try{ctx.drawImage(await loadImage(REVIEW_STAR_URL),cx-size/2,cy-size/2,size,size);}catch{/* Stern fehlt — Karte bleibt sichtbar */}}
function wrap(ctx:CanvasRenderingContext2D,text:string,maxWidth:number){
  const lines:string[]=[];
  for(const paragraph of text.split(/\n+/)){
    let line="";
    for(const word of paragraph.split(/\s+/).filter(Boolean)){
      const next=line?`${line} ${word}`:word;
      if(ctx.measureText(next).width>maxWidth&&line){lines.push(line);line=word;} else line=next;
    }
    if(line)lines.push(line);
  }
  return lines;
}
export function reviewCardHeight(ctx:CanvasRenderingContext2D,review:StoryReview,width=CARD.w){
  ctx.font=font(400,20);
  const lines=wrap(ctx,review.text,width-CARD.pad*2);
  return CARD.textBaseline+(lines.length-1)*CARD.lineHeight+CARD.bottom;
}
export async function drawReviewCard(ctx:CanvasRenderingContext2D,review:StoryReview,x:number,y:number,width=CARD.w){
  ctx.save();
  ctx.font=font(400,20);
  const lines=wrap(ctx,review.text,width-CARD.pad*2);
  const height=CARD.textBaseline+(lines.length-1)*CARD.lineHeight+CARD.bottom;
  ctx.shadowColor="rgba(0,0,0,.30)";ctx.shadowBlur=30;ctx.shadowOffsetY=8;
  ctx.fillStyle="#ffffff";ctx.beginPath();ctx.roundRect(x,y,width,height,CARD.radius);ctx.fill();
  ctx.shadowColor="transparent";ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  await drawGoogleG(ctx,x+CARD.pad,y+41,66);
  const stars=Math.max(1,Math.min(5,review.stars||5));
  const starOuter=25,gapX=53,startX=x+CARD.pad+66+30+starOuter;
  for(let i=0;i<stars;i++)await drawStar(ctx,startX+i*gapX,y+74,starOuter*2);
  ctx.fillStyle="#202124";ctx.font=font(700,23);
  ctx.fillText(review.name.toUpperCase(),x+CARD.pad,y+CARD.nameBaseline,width-CARD.pad*2);
  ctx.fillStyle="#3c4043";ctx.font=font(400,20);
  lines.forEach((line,i)=>ctx.fillText(line,x+CARD.pad,y+CARD.textBaseline+i*CARD.lineHeight));
  ctx.restore();
  return height;
}
function cardPosition(ctx:CanvasRenderingContext2D,review:StoryReview,pos:ReviewPosition,offset:number){
  const height=reviewCardHeight(ctx,review);
  const x=pos.endsWith("rechts")?STORY_WIDTH-CARD.margin-CARD.w:CARD.margin;
  const y=(pos.startsWith("oben")?CARD.topY:PHOTO.y+PHOTO.h-height-30)+offset;
  return {x,y};
}

export async function renderStory(canvas:HTMLCanvasElement,templateUrl:string=STORY_TEMPLATE_URL,photo:StoryPhoto,photos:StoryPhoto[],review?:StoryReview){
  await ensureStoryFonts();
  canvas.width=STORY_WIDTH;canvas.height=STORY_HEIGHT;
  const ctx=canvas.getContext("2d");if(!ctx)return;
  ctx.textAlign="start";ctx.textBaseline="alphabetic";
  await drawTemplate(ctx,templateUrl);
  if(photo.layout==="landschaft"){
    const h=(PHOTO.h-34)/2;
    await drawCover(ctx,photo.url,70,PHOTO.y,940,h,photo.crop);
    const pair=photos.find(p=>p.id===photo.pairId);
    if(pair)await drawCover(ctx,pair.url,70,PHOTO.y+h+34,940,h,pair.crop);
  } else if(photo.layout==="vorher-nachher"){
    const pair=photos.find(p=>p.id===photo.pairId);
    const w=(940-30)/2;
    await drawCover(ctx,photo.url,70,PHOTO.y,w,PHOTO.h,photo.crop);
    if(pair)await drawCover(ctx,pair.url,70+w+30,PHOTO.y,w,PHOTO.h,pair.crop);
    ctx.save();ctx.font=font(700,38);ctx.textAlign="center";ctx.fillStyle="#fff";
    ctx.fillText("VORHER",70+w/2,PHOTO.y+PHOTO.h+52);
    ctx.fillText("NACHHER",70+w+30+w/2,PHOTO.y+PHOTO.h+52);
    ctx.restore();
  } else await drawCover(ctx,photo.url,PHOTO.x,PHOTO.y,PHOTO.w,PHOTO.h,photo.crop);
  if(photo.title){ctx.save();ctx.fillStyle="#fff";ctx.textAlign="center";ctx.font=font(600,48);ctx.fillText(photo.title,540,TITLE_BASELINE,980);ctx.restore();}
  if(review){const {x,y}=cardPosition(ctx,review,photo.reviewPosition,photo.reviewOffset);await drawReviewCard(ctx,review,x,y);}
}

export async function renderReviewEnding(canvas:HTMLCanvasElement,templateUrl:string=STORY_TEMPLATE_URL,reviews:StoryReview[]){
  await ensureStoryFonts();
  canvas.width=STORY_WIDTH;canvas.height=STORY_HEIGHT;
  const ctx=canvas.getContext("2d");if(!ctx)return;
  await drawTemplate(ctx,templateUrl);
  ctx.save();ctx.fillStyle="#fff";ctx.font=font(600,52);ctx.textAlign="center";
  ctx.fillText("Das sagen unsere Kunden",540,640);ctx.restore();
  const width=STORY_WIDTH-CARD.margin*2;
  let y=700;
  for(const review of reviews){
    const height=reviewCardHeight(ctx,review,width);
    if(y+height>1780)break;
    await drawReviewCard(ctx,review,CARD.margin,y,width);
    y+=height+28;
  }
}

export async function renderGoogleEnding(canvas:HTMLCanvasElement,templateUrl:string=STORY_TEMPLATE_URL,qrDataUrl?:string){
  await ensureStoryFonts();
  canvas.width=STORY_WIDTH;canvas.height=STORY_HEIGHT;
  const ctx=canvas.getContext("2d");if(!ctx)return;
  await drawTemplate(ctx,templateUrl);
  ctx.save();ctx.textAlign="center";
  await drawGoogleG(ctx,540-55,660,110);
  ctx.fillStyle="#fff";ctx.font=font(600,54);
  ctx.fillText("Bewerten Sie uns",540,860);
  ctx.fillText("auf Google",540,930);
  for(let i=0;i<5;i++)await drawStar(ctx,540-4*36+i*72,1010,64);
  if(qrDataUrl){
    const qr=await loadImage(qrDataUrl);
    ctx.fillStyle="#fff";ctx.beginPath();ctx.roundRect(340,1110,400,400,28);ctx.fill();
    ctx.drawImage(qr,370,1140,340,340);
    ctx.fillStyle="#fff";ctx.font=font(400,30);
    ctx.fillText("QR-Code scannen und bewerten",540,1580);
  }
  ctx.restore();
}

export function canvasBlob(canvas:HTMLCanvasElement){return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Bild konnte nicht erstellt werden")),"image/png"));}
