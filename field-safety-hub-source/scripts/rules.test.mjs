import test from "node:test";
import assert from "node:assert/strict";
import { checkConfig,imageExtension } from "../src/rules.ts";
test("only public Supabase settings are accepted",()=>{
  assert.ok(checkConfig("",""));
  assert.equal(checkConfig("https://example.supabase.co","sb_publishable_example"),"");
  assert.ok(checkConfig("https://attacker.example","sb_publishable_example"));
  assert.ok(checkConfig("https://example.supabase.co","sb_secret_example"));
  assert.ok(checkConfig("https://example.supabase.co","eyJ_service_role"));
  assert.ok(checkConfig("https://example.supabase.co/path","sb_publishable_example"));
});
test("image signatures reject spoofed or unsupported files",()=>{
  assert.equal(imageExtension(new Uint8Array([0xff,0xd8,0xff])),"jpg");
  assert.equal(imageExtension(new Uint8Array([137,80,78,71,13,10,26,10])),"png");
  assert.equal(imageExtension(new TextEncoder().encode("RIFF1234WEBP")),"webp");
  assert.equal(imageExtension(new TextEncoder().encode("<html>not an image")),null);
  assert.equal(imageExtension(new Uint8Array()),null);
});
