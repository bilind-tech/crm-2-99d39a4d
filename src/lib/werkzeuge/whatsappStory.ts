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

const imageCache=new Map<string,Promise<HTMLImageElement>>();
function loadImage(src:string){let cached=imageCache.get(src);if(!cached){cached=new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;});imageCache.set(src,cached);}return cached;}

let fontsReady:Promise<void>|undefined;
export function ensureStoryFonts(){
  if(!fontsReady){
    const faces=["400 20px Montserrat","600 24px Montserrat","700 24px Montserrat","600 48px Montserrat"];
    fontsReady=(async()=>{
      try{ await Promise.all(faces.map(f=>document.fonts.load(f,"Mg"))); await document.fonts.ready; }catch{ /* Fallback-Schrift */ }
    })();
  }
  return fontsReady;
}
const font=(weight:number,size:number)=>`${weight} ${size}px Montserrat, "Helvetica Neue", Arial, sans-serif`;

function clipRounded(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.clip();}
async function drawCover(ctx:CanvasRenderingContext2D,src:string,x:number,y:number,w:number,h:number,crop:CropState,radius=PHOTO.r){const image=await loadImage(src);const base=Math.max(w/image.naturalWidth,h/image.naturalHeight)*crop.zoom;const dw=image.naturalWidth*base,dh=image.naturalHeight*base;ctx.save();clipRounded(ctx,x,y,w,h,radius);ctx.drawImage(image,x+(w-dw)/2+crop.x,y+(h-dh)/2+crop.y,dw,dh);ctx.restore();}

// Originalpfade des Google-„G" (48x48-Raster) als Vektor.
const G_PATHS:[string,string][]=[
  ["#4285F4","M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"],
  ["#34A853","M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"],
  ["#FBBC05","M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"],
  ["#EA4335","M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"],
];
function drawGoogleG(ctx:CanvasRenderingContext2D,x:number,y:number,size:number){
  ctx.save();ctx.translate(x,y);ctx.scale(size/48,size/48);
  for(const [color,d] of G_PATHS){ctx.fillStyle=color;ctx.fill(new Path2D(d));}
  ctx.restore();
}
function drawStar(ctx:CanvasRenderingContext2D,cx:number,cy:number,outer:number){
  const inner=outer*0.47;ctx.beginPath();
  for(let i=0;i<10;i++){const r=i%2?inner:outer;const a=-Math.PI/2+i*Math.PI/5;ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);}
  ctx.closePath();ctx.fill();
}
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
export function drawReviewCard(ctx:CanvasRenderingContext2D,review:StoryReview,x:number,y:number,width=CARD.w){
  ctx.save();
  ctx.font=font(400,20);
  const lines=wrap(ctx,review.text,width-CARD.pad*2);
  const height=CARD.textBaseline+(lines.length-1)*CARD.lineHeight+CARD.bottom;
  ctx.shadowColor="rgba(0,0,0,.30)";ctx.shadowBlur=30;ctx.shadowOffsetY=8;
  ctx.fillStyle="#ffffff";ctx.beginPath();ctx.roundRect(x,y,width,height,CARD.radius);ctx.fill();
  ctx.shadowColor="transparent";ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  drawGoogleG(ctx,x+CARD.pad,y+41,66);
  ctx.fillStyle="#F4B400";
  const stars=Math.max(1,Math.min(5,review.stars||5));
  const starOuter=25,gapX=53,startX=x+CARD.pad+66+30+starOuter;
  for(let i=0;i<stars;i++)drawStar(ctx,startX+i*gapX,y+74,starOuter);
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

export async function renderStory(canvas:HTMLCanvasElement,templateUrl:string,photo:StoryPhoto,photos:StoryPhoto[],review?:StoryReview){
  await ensureStoryFonts();
  canvas.width=STORY_WIDTH;canvas.height=STORY_HEIGHT;
  const ctx=canvas.getContext("2d");if(!ctx)return;
  ctx.textAlign="start";ctx.textBaseline="alphabetic";
  ctx.drawImage(await loadImage(templateUrl),0,0,STORY_WIDTH,STORY_HEIGHT);
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
  if(review){const {x,y}=cardPosition(ctx,review,photo.reviewPosition,photo.reviewOffset);drawReviewCard(ctx,review,x,y);}
}

export async function renderReviewEnding(canvas:HTMLCanvasElement,templateUrl:string,reviews:StoryReview[]){
  await ensureStoryFonts();
  canvas.width=STORY_WIDTH;canvas.height=STORY_HEIGHT;
  const ctx=canvas.getContext("2d");if(!ctx)return;
  ctx.drawImage(await loadImage(templateUrl),0,0,STORY_WIDTH,STORY_HEIGHT);
  ctx.save();ctx.fillStyle="#fff";ctx.font=font(600,52);ctx.textAlign="center";
  ctx.fillText("Das sagen unsere Kunden",540,640);ctx.restore();
  const width=STORY_WIDTH-CARD.margin*2;
  let y=700;
  for(const review of reviews){
    const height=reviewCardHeight(ctx,review,width);
    if(y+height>1780)break;
    drawReviewCard(ctx,review,CARD.margin,y,width);
    y+=height+28;
  }
}

export async function renderGoogleEnding(canvas:HTMLCanvasElement,templateUrl:string,qrDataUrl?:string){
  await ensureStoryFonts();
  canvas.width=STORY_WIDTH;canvas.height=STORY_HEIGHT;
  const ctx=canvas.getContext("2d");if(!ctx)return;
  ctx.drawImage(await loadImage(templateUrl),0,0,STORY_WIDTH,STORY_HEIGHT);
  ctx.save();ctx.textAlign="center";
  drawGoogleG(ctx,540-55,660,110);
  ctx.fillStyle="#fff";ctx.font=font(600,54);
  ctx.fillText("Bewerten Sie uns",540,860);
  ctx.fillText("auf Google",540,930);
  ctx.fillStyle="#F4B400";
  for(let i=0;i<5;i++)drawStar(ctx,540-4*36+i*72,1010,32);
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
