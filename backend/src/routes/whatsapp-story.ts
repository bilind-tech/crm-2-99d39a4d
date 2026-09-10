import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.js";
import { audit } from "../auth/audit.js";
import {
  addImage, createProject, createReview, deleteImage, deleteProject, deleteReview,
  getImageRaw, getProject, imageRefs, listProjects, listReviews, updateImage, updateProject, updateReview,
} from "../whatsapp-story/repo.js";
import { deleteStoryImage, openStoryImage, storeStoryImage, storyImageExists, storyImageSize } from "../whatsapp-story/storage.js";

const projectPatch = z.object({ name:z.string().trim().min(1).max(120).optional(), status:z.enum(["entwurf","fertig"]).optional(), konfiguration:z.record(z.string(),z.unknown()).optional() });
const imagePatch = z.object({ sortierung:z.number().int().min(0).optional(), konfiguration:z.record(z.string(),z.unknown()).optional() });
const reviewInput = z.object({ name:z.string().trim().min(1).max(120), text:z.string().trim().min(1).max(1000), sterne:z.number().int().min(1).max(5).default(5) });
const reviewPatch = reviewInput.partial();
const allowed = new Set(["image/jpeg","image/png","image/webp"]);
const MAX_BYTES = 25 * 1024 * 1024;
function validation(reply:FastifyReply, issues:unknown){ return reply.code(400).send({error:"validation",issues}); }
async function parseImage(req:FastifyRequest){
  if(!req.isMultipart()) return null;
  for await(const raw of (req as FastifyRequest & {parts:()=>AsyncIterable<unknown>}).parts()){
    const p=raw as {type:string;fieldname:string;filename?:string;mimetype?:string;file?:NodeJS.ReadableStream & {truncated?:boolean}};
    if(p.type!=="file"||p.fieldname!=="file"||!p.file) continue;
    const chunks:Buffer[]=[]; let total=0;
    for await(const chunk of p.file){ const b=chunk as Buffer; total+=b.length; if(total<=MAX_BYTES)chunks.push(b); }
    return {buffer:Buffer.concat(chunks),filename:p.filename??"bild",mimeType:p.mimetype??"",truncated:total>MAX_BYTES||!!p.file.truncated};
  }
  return null;
}
export async function whatsappStoryRoutes(app:FastifyInstance){
  app.addHook("preHandler",requireAuth);
  app.get("/whatsapp-story/projekte",async()=>({projekte:listProjects()}));
  app.post("/whatsapp-story/projekte",async(req,reply)=>{ const p=z.object({name:z.string().trim().min(1).max(120)}).safeParse(req.body); if(!p.success)return validation(reply,p.error.issues); const value=createProject(p.data.name); audit({userId:req.user?.id??null,action:"whatsapp-story.projekt.create",detail:{id:value.id}}); return reply.code(201).send(value); });
  app.get("/whatsapp-story/projekte/:id",async(req,reply)=>{const value=getProject((req.params as {id:string}).id); return value??reply.code(404).send({error:"not-found"});});
  app.patch("/whatsapp-story/projekte/:id",async(req,reply)=>{const p=projectPatch.safeParse(req.body);if(!p.success)return validation(reply,p.error.issues);const value=updateProject((req.params as {id:string}).id,p.data);return value??reply.code(404).send({error:"not-found"});});
  app.delete("/whatsapp-story/projekte/:id",async(req,reply)=>{const id=(req.params as {id:string}).id;const result=deleteProject(id);if(!result.deleted)return reply.code(404).send({error:"not-found"});for(const f of result.files)if(imageRefs(f.sha256)===0)deleteStoryImage(f.storage_path);return {ok:true};});
  app.post("/whatsapp-story/projekte/:id/bilder",async(req,reply)=>{const projectId=(req.params as {id:string}).id;if(!getProject(projectId))return reply.code(404).send({error:"not-found"});const f=await parseImage(req);if(!f)return reply.code(400).send({error:"file-required"});if(f.truncated)return reply.code(413).send({error:"file-too-large"});if(!allowed.has(f.mimeType))return reply.code(415).send({error:"unsupported-file"});const stored=await storeStoryImage(f.buffer,f.mimeType);return reply.code(201).send(addImage({projectId,dateiname:f.filename,mimeType:f.mimeType,...stored}));});
  app.get("/whatsapp-story/bilder/:id/datei",async(req,reply)=>{const row=getImageRaw((req.params as {id:string}).id);if(!row||!storyImageExists(row.storage_path))return reply.code(404).send({error:"not-found"});return reply.type(row.mime_type).header("Content-Length",String(storyImageSize(row.storage_path))).header("Cache-Control","private, max-age=3600").send(openStoryImage(row.storage_path));});
  app.patch("/whatsapp-story/bilder/:id",async(req,reply)=>{const p=imagePatch.safeParse(req.body);if(!p.success)return validation(reply,p.error.issues);const value=updateImage((req.params as {id:string}).id,p.data);return value??reply.code(404).send({error:"not-found"});});
  app.delete("/whatsapp-story/bilder/:id",async(req,reply)=>{const row=deleteImage((req.params as {id:string}).id);if(!row)return reply.code(404).send({error:"not-found"});if(imageRefs(row.sha256)===0)deleteStoryImage(row.storage_path);return {ok:true};});
  app.get("/whatsapp-story/bewertungen",async()=>({bewertungen:listReviews()}));
  app.post("/whatsapp-story/bewertungen",async(req,reply)=>{const p=reviewInput.safeParse(req.body);if(!p.success)return validation(reply,p.error.issues);return reply.code(201).send(createReview(p.data));});
  app.patch("/whatsapp-story/bewertungen/:id",async(req,reply)=>{const p=reviewPatch.safeParse(req.body);if(!p.success)return validation(reply,p.error.issues);const value=updateReview((req.params as {id:string}).id,p.data);return value??reply.code(404).send({error:"not-found"});});
  app.delete("/whatsapp-story/bewertungen/:id",async(req,reply)=>deleteReview((req.params as {id:string}).id)?{ok:true}:reply.code(404).send({error:"not-found"}));
}
