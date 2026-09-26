const Ny=()=>{};var ep={};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const nm=function(r){const e=[];let t=0;for(let n=0;n<r.length;n++){let s=r.charCodeAt(n);s<128?e[t++]=s:s<2048?(e[t++]=s>>6|192,e[t++]=s&63|128):(s&64512)===55296&&n+1<r.length&&(r.charCodeAt(n+1)&64512)===56320?(s=65536+((s&1023)<<10)+(r.charCodeAt(++n)&1023),e[t++]=s>>18|240,e[t++]=s>>12&63|128,e[t++]=s>>6&63|128,e[t++]=s&63|128):(e[t++]=s>>12|224,e[t++]=s>>6&63|128,e[t++]=s&63|128)}return e},Oy=function(r){const e=[];let t=0,n=0;for(;t<r.length;){const s=r[t++];if(s<128)e[n++]=String.fromCharCode(s);else if(s>191&&s<224){const i=r[t++];e[n++]=String.fromCharCode((s&31)<<6|i&63)}else if(s>239&&s<365){const i=r[t++],o=r[t++],a=r[t++],c=((s&7)<<18|(i&63)<<12|(o&63)<<6|a&63)-65536;e[n++]=String.fromCharCode(55296+(c>>10)),e[n++]=String.fromCharCode(56320+(c&1023))}else{const i=r[t++],o=r[t++];e[n++]=String.fromCharCode((s&15)<<12|(i&63)<<6|o&63)}}return e.join("")},rm={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(r,e){if(!Array.isArray(r))throw Error("encodeByteArray takes an array as a parameter");this.init_();const t=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,n=[];for(let s=0;s<r.length;s+=3){const i=r[s],o=s+1<r.length,a=o?r[s+1]:0,c=s+2<r.length,l=c?r[s+2]:0,B=i>>2,f=(i&3)<<4|a>>4;let p=(a&15)<<2|l>>6,m=l&63;c||(m=64,o||(p=64)),n.push(t[B],t[f],t[p],t[m])}return n.join("")},encodeString(r,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(r):this.encodeByteArray(nm(r),e)},decodeString(r,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(r):Oy(this.decodeStringToByteArray(r,e))},decodeStringToByteArray(r,e){this.init_();const t=e?this.charToByteMapWebSafe_:this.charToByteMap_,n=[];for(let s=0;s<r.length;){const i=t[r.charAt(s++)],a=s<r.length?t[r.charAt(s)]:0;++s;const l=s<r.length?t[r.charAt(s)]:64;++s;const f=s<r.length?t[r.charAt(s)]:64;if(++s,i==null||a==null||l==null||f==null)throw new Fy;const p=i<<2|a>>4;if(n.push(p),l!==64){const m=a<<4&240|l>>2;if(n.push(m),f!==64){const y=l<<6&192|f;n.push(y)}}}return n},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let r=0;r<this.ENCODED_VALS.length;r++)this.byteToCharMap_[r]=this.ENCODED_VALS.charAt(r),this.charToByteMap_[this.byteToCharMap_[r]]=r,this.byteToCharMapWebSafe_[r]=this.ENCODED_VALS_WEBSAFE.charAt(r),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[r]]=r,r>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(r)]=r,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(r)]=r)}}};class Fy extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const Ly=function(r){const e=nm(r);return rm.encodeByteArray(e,!0)},Dc=function(r){return Ly(r).replace(/\./g,"")},sm=function(r){try{return rm.decodeString(r,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function im(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ky=()=>im().__FIREBASE_DEFAULTS__,xy=()=>{if(typeof process>"u"||typeof ep>"u")return;const r=ep.__FIREBASE_DEFAULTS__;if(r)return JSON.parse(r)},Vy=()=>{if(typeof document>"u")return;let r;try{r=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=r&&sm(r[1]);return e&&JSON.parse(e)},iu=()=>{try{return Ny()||ky()||xy()||Vy()}catch(r){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${r}`);return}},om=r=>iu()?.emulatorHosts?.[r],am=r=>{const e=om(r);if(!e)return;const t=e.lastIndexOf(":");if(t<=0||t+1===e.length)throw new Error(`Invalid host ${e} with no separate hostname and port!`);const n=parseInt(e.substring(t+1),10);return e[0]==="["?[e.substring(1,t-1),n]:[e.substring(0,t),n]},cm=()=>iu()?.config,um=r=>iu()?.[`_${r}`];/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lm{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}wrapCallback(e){return(t,n)=>{t?this.reject(t):this.resolve(n),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(t):e(t,n))}}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function My(r,e){if(r.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const t={alg:"none",type:"JWT"},n=e||"demo-project",s=r.iat||0,i=r.sub||r.user_id;if(!i)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const o={iss:`https://securetoken.google.com/${n}`,aud:n,iat:s,exp:s+3600,auth_time:s,sub:i,user_id:i,firebase:{sign_in_provider:"custom",identities:{}},...r};return[Dc(JSON.stringify(t)),Dc(JSON.stringify(o)),""].join(".")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function He(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function Gy(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(He())}function Bm(){const r=iu()?.forceEnvironment;if(r==="node")return!0;if(r==="browser")return!1;try{return Object.prototype.toString.call(global.process)==="[object process]"}catch{return!1}}function Uy(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function JB(){const r=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof r=="object"&&r.id!==void 0}function Hy(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function qy(){const r=He();return r.indexOf("MSIE ")>=0||r.indexOf("Trident/")>=0}function hm(){return!Bm()&&!!navigator.userAgent&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")}function fm(){return!Bm()&&!!navigator.userAgent&&(navigator.userAgent.includes("Safari")||navigator.userAgent.includes("WebKit"))&&!navigator.userAgent.includes("Chrome")}function Yo(){try{return typeof indexedDB=="object"}catch{return!1}}function ou(){return new Promise((r,e)=>{try{let t=!0;const n="validate-browser-context-for-indexeddb-analytics-module",s=self.indexedDB.open(n);s.onsuccess=()=>{s.result.close(),t||self.indexedDB.deleteDatabase(n),r(!0)},s.onupgradeneeded=()=>{t=!1},s.onerror=()=>{e(s.error?.message||"")}}catch(t){e(t)}})}function zB(){return!(typeof navigator>"u"||!navigator.cookieEnabled)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const jy="FirebaseError";class xt extends Error{constructor(e,t,n){super(t),this.code=e,this.customData=n,this.name=jy,Object.setPrototypeOf(this,xt.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,vr.prototype.create)}}class vr{constructor(e,t,n){this.service=e,this.serviceName=t,this.errors=n}create(e,...t){const n=t[0]||{},s=`${this.service}/${e}`,i=this.errors[e],o=i?Ky(i,n):"Error",a=`${this.serviceName}: ${o} (${s}).`;return new xt(s,a,n)}}function Ky(r,e){try{let t=0,n="";for(;t<r.length;){const s=r.indexOf("{$",t);if(s===-1){n+=r.substring(t);break}const i=r.indexOf("}",s+2);if(i===-1){n+=r.substring(t);break}const o=r.substring(s+2,i),a=e[o];n+=r.substring(t,s)+(a!=null?String(a):`<${o}?>`),t=i+1}return n}catch{return r}}function Jy(r){for(const e in r)if(Object.prototype.hasOwnProperty.call(r,e))return!1;return!0}function Cr(r,e){if(r===e)return!0;const t=Object.keys(r),n=Object.keys(e);for(const s of t){if(!n.includes(s))return!1;const i=r[s],o=e[s];if(tp(i)&&tp(o)){if(!Cr(i,o))return!1}else if(i!==o)return!1}for(const s of n)if(!t.includes(s))return!1;return!0}function tp(r){return r!==null&&typeof r=="object"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Xo(r){const e=[];for(const[t,n]of Object.entries(r))Array.isArray(n)?n.forEach(s=>{e.push(encodeURIComponent(t)+"="+encodeURIComponent(s))}):e.push(encodeURIComponent(t)+"="+encodeURIComponent(n));return e.length?"&"+e.join("&"):""}function ro(r){const e={};return r.replace(/^\?/,"").split("&").forEach(n=>{if(n){const[s,i]=n.split("=");e[decodeURIComponent(s)]=decodeURIComponent(i)}}),e}function so(r){const e=r.indexOf("?");if(!e)return"";const t=r.indexOf("#",e);return r.substring(e,t>0?t:void 0)}function zy(r,e){const t=new $y(r,e);return t.subscribe.bind(t)}class $y{constructor(e,t){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=t,this.task.then(()=>{e(this)}).catch(n=>{this.error(n)})}next(e){this.forEachObserver(t=>{t.next(e)})}error(e){this.forEachObserver(t=>{t.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,t,n){let s;if(e===void 0&&t===void 0&&n===void 0)throw new Error("Missing Observer.");Qy(e,["next","error","complete"])?s=e:s={next:e,error:t,complete:n},s.next===void 0&&(s.next=Cl),s.error===void 0&&(s.error=Cl),s.complete===void 0&&(s.complete=Cl);const i=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?s.error(this.finalError):s.complete()}catch{}}),this.observers.push(s),i}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let t=0;t<this.observers.length;t++)this.sendOne(t,e)}sendOne(e,t){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{t(this.observers[e])}catch(n){typeof console<"u"&&console.error&&console.error(n)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function Qy(r,e){if(typeof r!="object"||r===null)return!1;for(const t of e)if(t in r&&typeof r[t]=="function")return!0;return!1}function Cl(){}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Wy=1e3,Yy=2,Xy=14400*1e3,Zy=.5;function np(r,e=Wy,t=Yy){const n=e*Math.pow(t,r),s=Math.round(Zy*n*(Math.random()-.5)*2);return Math.min(Xy,n+s)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ce(r){return r&&r._delegate?r._delegate:r}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Vn(r){try{return(r.startsWith("http://")||r.startsWith("https://")?new URL(r).hostname:r).endsWith(".cloudworkstations.dev")}catch{return!1}}async function au(r){return(await fetch(r,{credentials:"include"})).ok}class Dt{constructor(e,t,n){this.name=e,this.instanceFactory=t,this.type=n,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Mr="[DEFAULT]";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eT{constructor(e,t){this.name=e,this.container=t,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const t=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(t)){const n=new lm;if(this.instancesDeferred.set(t,n),this.isInitialized(t)||this.shouldAutoInitialize())try{const s=this.getOrInitializeService({instanceIdentifier:t});s&&n.resolve(s)}catch{}}return this.instancesDeferred.get(t).promise}getImmediate(e){const t=this.normalizeInstanceIdentifier(e?.identifier),n=e?.optional??!1;if(this.isInitialized(t)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:t})}catch(s){if(n)return null;throw s}else{if(n)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(nT(e))try{this.getOrInitializeService({instanceIdentifier:Mr})}catch{}for(const[t,n]of this.instancesDeferred.entries()){const s=this.normalizeInstanceIdentifier(t);try{const i=this.getOrInitializeService({instanceIdentifier:s});n.resolve(i)}catch{}}}}clearInstance(e=Mr){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(t=>"INTERNAL"in t).map(t=>t.INTERNAL.delete()),...e.filter(t=>"_delete"in t).map(t=>t._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=Mr){return this.instances.has(e)}getOptions(e=Mr){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:t={}}=e,n=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(n))throw Error(`${this.name}(${n}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const s=this.getOrInitializeService({instanceIdentifier:n,options:t});for(const[i,o]of this.instancesDeferred.entries()){const a=this.normalizeInstanceIdentifier(i);n===a&&o.resolve(s)}return s}onInit(e,t){const n=this.normalizeInstanceIdentifier(t),s=this.onInitCallbacks.get(n)??new Set;s.add(e),this.onInitCallbacks.set(n,s);const i=this.instances.get(n);return i&&e(i,n),()=>{s.delete(e)}}invokeOnInitCallbacks(e,t){const n=this.onInitCallbacks.get(t);if(n)for(const s of n)try{s(e,t)}catch{}}getOrInitializeService({instanceIdentifier:e,options:t={}}){let n=this.instances.get(e);if(!n&&this.component&&(n=this.component.instanceFactory(this.container,{instanceIdentifier:tT(e),options:t}),this.instances.set(e,n),this.instancesOptions.set(e,t),this.invokeOnInitCallbacks(n,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,n)}catch{}return n||null}normalizeInstanceIdentifier(e=Mr){return this.component?this.component.multipleInstances?e:Mr:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function tT(r){return r===Mr?void 0:r}function nT(r){return r.instantiationMode==="EAGER"}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rT{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const t=this.getProvider(e.name);if(t.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);t.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const t=new eT(e,this);return this.providers.set(e,t),t}getProviders(){return Array.from(this.providers.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Be;(function(r){r[r.DEBUG=0]="DEBUG",r[r.VERBOSE=1]="VERBOSE",r[r.INFO=2]="INFO",r[r.WARN=3]="WARN",r[r.ERROR=4]="ERROR",r[r.SILENT=5]="SILENT"})(Be||(Be={}));const sT={debug:Be.DEBUG,verbose:Be.VERBOSE,info:Be.INFO,warn:Be.WARN,error:Be.ERROR,silent:Be.SILENT},iT=Be.INFO,oT={[Be.DEBUG]:"log",[Be.VERBOSE]:"log",[Be.INFO]:"info",[Be.WARN]:"warn",[Be.ERROR]:"error"},aT=(r,e,...t)=>{if(e<r.logLevel)return;const n=new Date().toISOString(),s=oT[e];if(s)console[s](`[${n}]  ${r.name}:`,...t);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class Zo{constructor(e){this.name=e,this._logLevel=iT,this._logHandler=aT,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in Be))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?sT[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,Be.DEBUG,...e),this._logHandler(this,Be.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,Be.VERBOSE,...e),this._logHandler(this,Be.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,Be.INFO,...e),this._logHandler(this,Be.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,Be.WARN,...e),this._logHandler(this,Be.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,Be.ERROR,...e),this._logHandler(this,Be.ERROR,...e)}}const cT=(r,e)=>e.some(t=>r instanceof t);let rp,sp;function uT(){return rp||(rp=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function lT(){return sp||(sp=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const dm=new WeakMap,$l=new WeakMap,pm=new WeakMap,gl=new WeakMap,$B=new WeakMap;function BT(r){const e=new Promise((t,n)=>{const s=()=>{r.removeEventListener("success",i),r.removeEventListener("error",o)},i=()=>{t(Br(r.result)),s()},o=()=>{n(r.error),s()};r.addEventListener("success",i),r.addEventListener("error",o)});return e.then(t=>{t instanceof IDBCursor&&dm.set(t,r)}).catch(()=>{}),$B.set(e,r),e}function hT(r){if($l.has(r))return;const e=new Promise((t,n)=>{const s=()=>{r.removeEventListener("complete",i),r.removeEventListener("error",o),r.removeEventListener("abort",o)},i=()=>{t(),s()},o=()=>{n(r.error||new DOMException("AbortError","AbortError")),s()};r.addEventListener("complete",i),r.addEventListener("error",o),r.addEventListener("abort",o)});$l.set(r,e)}let Ql={get(r,e,t){if(r instanceof IDBTransaction){if(e==="done")return $l.get(r);if(e==="objectStoreNames")return r.objectStoreNames||pm.get(r);if(e==="store")return t.objectStoreNames[1]?void 0:t.objectStore(t.objectStoreNames[0])}return Br(r[e])},set(r,e,t){return r[e]=t,!0},has(r,e){return r instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in r}};function fT(r){Ql=r(Ql)}function dT(r){return r===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...t){const n=r.call(ml(this),e,...t);return pm.set(n,e.sort?e.sort():[e]),Br(n)}:lT().includes(r)?function(...e){return r.apply(ml(this),e),Br(dm.get(this))}:function(...e){return Br(r.apply(ml(this),e))}}function pT(r){return typeof r=="function"?dT(r):(r instanceof IDBTransaction&&hT(r),cT(r,uT())?new Proxy(r,Ql):r)}function Br(r){if(r instanceof IDBRequest)return BT(r);if(gl.has(r))return gl.get(r);const e=pT(r);return e!==r&&(gl.set(r,e),$B.set(e,r)),e}const ml=r=>$B.get(r);function Cm(r,e,{blocked:t,upgrade:n,blocking:s,terminated:i}={}){const o=indexedDB.open(r,e),a=Br(o);return n&&o.addEventListener("upgradeneeded",c=>{n(Br(o.result),c.oldVersion,c.newVersion,Br(o.transaction),c)}),t&&o.addEventListener("blocked",c=>t(c.oldVersion,c.newVersion,c)),a.then(c=>{i&&c.addEventListener("close",()=>i()),s&&c.addEventListener("versionchange",l=>s(l.oldVersion,l.newVersion,l))}).catch(()=>{}),a}const CT=["get","getKey","getAll","getAllKeys","count"],gT=["put","add","delete","clear"],_l=new Map;function ip(r,e){if(!(r instanceof IDBDatabase&&!(e in r)&&typeof e=="string"))return;if(_l.get(e))return _l.get(e);const t=e.replace(/FromIndex$/,""),n=e!==t,s=gT.includes(t);if(!(t in(n?IDBIndex:IDBObjectStore).prototype)||!(s||CT.includes(t)))return;const i=async function(o,...a){const c=this.transaction(o,s?"readwrite":"readonly");let l=c.store;return n&&(l=l.index(a.shift())),(await Promise.all([l[t](...a),s&&c.done]))[0]};return _l.set(e,i),i}fT(r=>({...r,get:(e,t,n)=>ip(e,t)||r.get(e,t,n),has:(e,t)=>!!ip(e,t)||r.has(e,t)}));/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mT{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(t=>{if(_T(t)){const n=t.getImmediate();return`${n.library}/${n.version}`}else return null}).filter(t=>t).join(" ")}}function _T(r){return r.getComponent()?.type==="VERSION"}const Wl="@firebase/app",op="0.16.2";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Sn=new Zo("@firebase/app"),ET="@firebase/app-compat",IT="@firebase/analytics-compat",DT="@firebase/analytics",yT="@firebase/app-check-compat",TT="@firebase/app-check",wT="@firebase/auth",AT="@firebase/auth-compat",vT="@firebase/database",RT="@firebase/data-connect",bT="@firebase/database-compat",ST="@firebase/functions",PT="@firebase/functions-compat",NT="@firebase/installations",OT="@firebase/installations-compat",FT="@firebase/messaging",LT="@firebase/messaging-compat",kT="@firebase/performance",xT="@firebase/performance-compat",VT="@firebase/remote-config",MT="@firebase/remote-config-compat",GT="@firebase/storage",UT="@firebase/storage-compat",HT="@firebase/firestore",qT="@firebase/ai",jT="@firebase/firestore-compat",KT="firebase",JT="12.19.0";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const yc="[DEFAULT]",zT={[Wl]:"fire-core",[ET]:"fire-core-compat",[DT]:"fire-analytics",[IT]:"fire-analytics-compat",[TT]:"fire-app-check",[yT]:"fire-app-check-compat",[wT]:"fire-auth",[AT]:"fire-auth-compat",[vT]:"fire-rtdb",[RT]:"fire-data-connect",[bT]:"fire-rtdb-compat",[ST]:"fire-fn",[PT]:"fire-fn-compat",[NT]:"fire-iid",[OT]:"fire-iid-compat",[FT]:"fire-fcm",[LT]:"fire-fcm-compat",[kT]:"fire-perf",[xT]:"fire-perf-compat",[VT]:"fire-rc",[MT]:"fire-rc-compat",[GT]:"fire-gcs",[UT]:"fire-gcs-compat",[HT]:"fire-fst",[jT]:"fire-fst-compat",[qT]:"fire-vertex","fire-js":"fire-js",[KT]:"fire-js-all"};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Tc=new Map,$T=new Map,Yl=new Map;function ap(r,e){try{r.container.addComponent(e)}catch(t){Sn.debug(`Component ${e.name} failed to register with FirebaseApp ${r.name}`,t)}}function Lt(r){const e=r.name;if(Yl.has(e))return Sn.debug(`There were multiple attempts to register component ${e}.`),!1;Yl.set(e,r);for(const t of Tc.values())ap(t,r);for(const t of $T.values())ap(t,r);return!0}function Zt(r,e){const t=r.container.getProvider("heartbeat").getImmediate({optional:!0});return t&&t.triggerHeartbeat(),r.container.getProvider(e)}function QT(r,e,t=yc){Zt(r,e).clearInstance(t)}function mt(r){return r==null?!1:r.settings!==void 0}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const WT={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different {$mismatchedParam}. Existing: '{$oldValue}'. New: '{$newValue}'.","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},yn=new vr("app","Firebase",WT);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class YT{constructor(e,t,n){this._isDeleted=!1,this._options={...e},this._config={...t},this._name=t.name,this._automaticDataCollectionEnabled=t.automaticDataCollectionEnabled,this._container=n,this.container.addComponent(new Dt("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw yn.create("app-deleted",{appName:this._name})}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Is=JT;function XT(r,e={}){let t=r;typeof e!="object"&&(e={name:e});const n={name:yc,automaticDataCollectionEnabled:!0,...e},s=n.name;if(typeof s!="string"||!s)throw yn.create("bad-app-name",{appName:String(s)});if(t||(t=cm()),!t)throw yn.create("no-options");const i=Tc.get(s);if(i)if(Cr(t,i.options)){if(Cr(n,i.config))return i;throw yn.create("duplicate-app",{appName:s,mismatchedParam:"config",oldValue:JSON.stringify(i.config),newValue:JSON.stringify(n)})}else throw yn.create("duplicate-app",{appName:s,mismatchedParam:"options",oldValue:JSON.stringify(i.options),newValue:JSON.stringify(t)});const o=new rT(s);for(const c of Yl.values())o.addComponent(c);const a=new YT(t,n,o);return Tc.set(s,a),a}function ea(r=yc){const e=Tc.get(r);if(!e&&r===yc&&cm())return XT();if(!e)throw yn.create("no-app",{appName:r});return e}function Qe(r,e,t){let n=zT[r]??r;t&&(n+=`-${t}`);const s=n.match(/\s|\//),i=e.match(/\s|\//);if(s||i){const o=[`Unable to register library "${n}" with version "${e}":`];s&&o.push(`library name "${n}" contains illegal characters (whitespace or "/")`),s&&i&&o.push("and"),i&&o.push(`version name "${e}" contains illegal characters (whitespace or "/")`),Sn.warn(o.join(" "));return}Lt(new Dt(`${n}-version`,()=>({library:n,version:e}),"VERSION"))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ZT="firebase-heartbeat-database",ew=1,bo="firebase-heartbeat-store";let El=null;function gm(){return El||(El=Cm(ZT,ew,{upgrade:(r,e)=>{switch(e){case 0:try{r.createObjectStore(bo)}catch(t){console.warn(t)}}}}).catch(r=>{throw yn.create("idb-open",{originalErrorMessage:r.message})})),El}async function tw(r){try{const t=(await gm()).transaction(bo),n=await t.objectStore(bo).get(mm(r));return await t.done,n}catch(e){if(e instanceof xt)Sn.warn(e.message);else{const t=yn.create("idb-get",{originalErrorMessage:e?.message});Sn.warn(t.message)}}}async function cp(r,e){try{const n=(await gm()).transaction(bo,"readwrite");await n.objectStore(bo).put(e,mm(r)),await n.done}catch(t){if(t instanceof xt)Sn.warn(t.message);else{const n=yn.create("idb-set",{originalErrorMessage:t?.message});Sn.warn(n.message)}}}function mm(r){return`${r.name}!${r.options.appId}`}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const nw=1024,rw=30;class sw{constructor(e){this.container=e,this._heartbeatsCache=null;const t=this.container.getProvider("app").getImmediate();this._storage=new ow(t),this._heartbeatsCachePromise=this._storage.read().then(n=>(this._heartbeatsCache=n,n))}async triggerHeartbeat(){try{const t=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),n=up();if(this._heartbeatsCache?.heartbeats==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,this._heartbeatsCache?.heartbeats==null)||this._heartbeatsCache.lastSentHeartbeatDate===n||this._heartbeatsCache.heartbeats.some(s=>s.date===n))return;if(this._heartbeatsCache.heartbeats.push({date:n,agent:t}),this._heartbeatsCache.heartbeats.length>rw){const s=aw(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(s,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(e){Sn.warn(e)}}async getHeartbeatsHeader(){try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,this._heartbeatsCache?.heartbeats==null||this._heartbeatsCache.heartbeats.length===0)return"";const e=up(),{heartbeatsToSend:t,unsentEntries:n}=iw(this._heartbeatsCache.heartbeats),s=Dc(JSON.stringify({version:2,heartbeats:t}));return this._heartbeatsCache.lastSentHeartbeatDate=e,n.length>0?(this._heartbeatsCache.heartbeats=n,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),s}catch(e){return Sn.warn(e),""}}}function up(){return new Date().toISOString().substring(0,10)}function iw(r,e=nw){const t=[];let n=r.slice();for(const s of r){const i=t.find(o=>o.agent===s.agent);if(i){if(i.dates.push(s.date),lp(t)>e){i.dates.pop();break}}else if(t.push({agent:s.agent,dates:[s.date]}),lp(t)>e){t.pop();break}n=n.slice(1)}return{heartbeatsToSend:t,unsentEntries:n}}class ow{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Yo()?ou().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const t=await tw(this.app);return t?.heartbeats?t:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){if(await this._canUseIndexedDBPromise){const n=await this.read();return cp(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??n.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){if(await this._canUseIndexedDBPromise){const n=await this.read();return cp(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??n.lastSentHeartbeatDate,heartbeats:[...n.heartbeats,...e.heartbeats]})}else return}}function lp(r){return Dc(JSON.stringify({version:2,heartbeats:r})).length}function aw(r){if(r.length===0)return-1;let e=0,t=r[0].date;for(let n=1;n<r.length;n++)r[n].date<t&&(t=r[n].date,e=n);return e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function cw(r){Lt(new Dt("platform-logger",e=>new mT(e),"PRIVATE")),Lt(new Dt("heartbeat",e=>new sw(e),"PRIVATE")),Qe(Wl,op,r),Qe(Wl,op,"esm2020"),Qe("fire-js","")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */cw("");var Bp=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var hr,_m;(function(){var r;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function e(T,E){function D(){}D.prototype=E.prototype,T.F=E.prototype,T.prototype=new D,T.prototype.constructor=T,T.D=function(R,v,P){for(var I=Array(arguments.length-2),pt=2;pt<arguments.length;pt++)I[pt-2]=arguments[pt];return E.prototype[v].apply(R,I)}}function t(){this.blockSize=-1}function n(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.C=Array(this.blockSize),this.o=this.h=0,this.u()}e(n,t),n.prototype.u=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function s(T,E,D){D||(D=0);const R=Array(16);if(typeof E=="string")for(var v=0;v<16;++v)R[v]=E.charCodeAt(D++)|E.charCodeAt(D++)<<8|E.charCodeAt(D++)<<16|E.charCodeAt(D++)<<24;else for(v=0;v<16;++v)R[v]=E[D++]|E[D++]<<8|E[D++]<<16|E[D++]<<24;E=T.g[0],D=T.g[1],v=T.g[2];let P=T.g[3],I;I=E+(P^D&(v^P))+R[0]+3614090360&4294967295,E=D+(I<<7&4294967295|I>>>25),I=P+(v^E&(D^v))+R[1]+3905402710&4294967295,P=E+(I<<12&4294967295|I>>>20),I=v+(D^P&(E^D))+R[2]+606105819&4294967295,v=P+(I<<17&4294967295|I>>>15),I=D+(E^v&(P^E))+R[3]+3250441966&4294967295,D=v+(I<<22&4294967295|I>>>10),I=E+(P^D&(v^P))+R[4]+4118548399&4294967295,E=D+(I<<7&4294967295|I>>>25),I=P+(v^E&(D^v))+R[5]+1200080426&4294967295,P=E+(I<<12&4294967295|I>>>20),I=v+(D^P&(E^D))+R[6]+2821735955&4294967295,v=P+(I<<17&4294967295|I>>>15),I=D+(E^v&(P^E))+R[7]+4249261313&4294967295,D=v+(I<<22&4294967295|I>>>10),I=E+(P^D&(v^P))+R[8]+1770035416&4294967295,E=D+(I<<7&4294967295|I>>>25),I=P+(v^E&(D^v))+R[9]+2336552879&4294967295,P=E+(I<<12&4294967295|I>>>20),I=v+(D^P&(E^D))+R[10]+4294925233&4294967295,v=P+(I<<17&4294967295|I>>>15),I=D+(E^v&(P^E))+R[11]+2304563134&4294967295,D=v+(I<<22&4294967295|I>>>10),I=E+(P^D&(v^P))+R[12]+1804603682&4294967295,E=D+(I<<7&4294967295|I>>>25),I=P+(v^E&(D^v))+R[13]+4254626195&4294967295,P=E+(I<<12&4294967295|I>>>20),I=v+(D^P&(E^D))+R[14]+2792965006&4294967295,v=P+(I<<17&4294967295|I>>>15),I=D+(E^v&(P^E))+R[15]+1236535329&4294967295,D=v+(I<<22&4294967295|I>>>10),I=E+(v^P&(D^v))+R[1]+4129170786&4294967295,E=D+(I<<5&4294967295|I>>>27),I=P+(D^v&(E^D))+R[6]+3225465664&4294967295,P=E+(I<<9&4294967295|I>>>23),I=v+(E^D&(P^E))+R[11]+643717713&4294967295,v=P+(I<<14&4294967295|I>>>18),I=D+(P^E&(v^P))+R[0]+3921069994&4294967295,D=v+(I<<20&4294967295|I>>>12),I=E+(v^P&(D^v))+R[5]+3593408605&4294967295,E=D+(I<<5&4294967295|I>>>27),I=P+(D^v&(E^D))+R[10]+38016083&4294967295,P=E+(I<<9&4294967295|I>>>23),I=v+(E^D&(P^E))+R[15]+3634488961&4294967295,v=P+(I<<14&4294967295|I>>>18),I=D+(P^E&(v^P))+R[4]+3889429448&4294967295,D=v+(I<<20&4294967295|I>>>12),I=E+(v^P&(D^v))+R[9]+568446438&4294967295,E=D+(I<<5&4294967295|I>>>27),I=P+(D^v&(E^D))+R[14]+3275163606&4294967295,P=E+(I<<9&4294967295|I>>>23),I=v+(E^D&(P^E))+R[3]+4107603335&4294967295,v=P+(I<<14&4294967295|I>>>18),I=D+(P^E&(v^P))+R[8]+1163531501&4294967295,D=v+(I<<20&4294967295|I>>>12),I=E+(v^P&(D^v))+R[13]+2850285829&4294967295,E=D+(I<<5&4294967295|I>>>27),I=P+(D^v&(E^D))+R[2]+4243563512&4294967295,P=E+(I<<9&4294967295|I>>>23),I=v+(E^D&(P^E))+R[7]+1735328473&4294967295,v=P+(I<<14&4294967295|I>>>18),I=D+(P^E&(v^P))+R[12]+2368359562&4294967295,D=v+(I<<20&4294967295|I>>>12),I=E+(D^v^P)+R[5]+4294588738&4294967295,E=D+(I<<4&4294967295|I>>>28),I=P+(E^D^v)+R[8]+2272392833&4294967295,P=E+(I<<11&4294967295|I>>>21),I=v+(P^E^D)+R[11]+1839030562&4294967295,v=P+(I<<16&4294967295|I>>>16),I=D+(v^P^E)+R[14]+4259657740&4294967295,D=v+(I<<23&4294967295|I>>>9),I=E+(D^v^P)+R[1]+2763975236&4294967295,E=D+(I<<4&4294967295|I>>>28),I=P+(E^D^v)+R[4]+1272893353&4294967295,P=E+(I<<11&4294967295|I>>>21),I=v+(P^E^D)+R[7]+4139469664&4294967295,v=P+(I<<16&4294967295|I>>>16),I=D+(v^P^E)+R[10]+3200236656&4294967295,D=v+(I<<23&4294967295|I>>>9),I=E+(D^v^P)+R[13]+681279174&4294967295,E=D+(I<<4&4294967295|I>>>28),I=P+(E^D^v)+R[0]+3936430074&4294967295,P=E+(I<<11&4294967295|I>>>21),I=v+(P^E^D)+R[3]+3572445317&4294967295,v=P+(I<<16&4294967295|I>>>16),I=D+(v^P^E)+R[6]+76029189&4294967295,D=v+(I<<23&4294967295|I>>>9),I=E+(D^v^P)+R[9]+3654602809&4294967295,E=D+(I<<4&4294967295|I>>>28),I=P+(E^D^v)+R[12]+3873151461&4294967295,P=E+(I<<11&4294967295|I>>>21),I=v+(P^E^D)+R[15]+530742520&4294967295,v=P+(I<<16&4294967295|I>>>16),I=D+(v^P^E)+R[2]+3299628645&4294967295,D=v+(I<<23&4294967295|I>>>9),I=E+(v^(D|~P))+R[0]+4096336452&4294967295,E=D+(I<<6&4294967295|I>>>26),I=P+(D^(E|~v))+R[7]+1126891415&4294967295,P=E+(I<<10&4294967295|I>>>22),I=v+(E^(P|~D))+R[14]+2878612391&4294967295,v=P+(I<<15&4294967295|I>>>17),I=D+(P^(v|~E))+R[5]+4237533241&4294967295,D=v+(I<<21&4294967295|I>>>11),I=E+(v^(D|~P))+R[12]+1700485571&4294967295,E=D+(I<<6&4294967295|I>>>26),I=P+(D^(E|~v))+R[3]+2399980690&4294967295,P=E+(I<<10&4294967295|I>>>22),I=v+(E^(P|~D))+R[10]+4293915773&4294967295,v=P+(I<<15&4294967295|I>>>17),I=D+(P^(v|~E))+R[1]+2240044497&4294967295,D=v+(I<<21&4294967295|I>>>11),I=E+(v^(D|~P))+R[8]+1873313359&4294967295,E=D+(I<<6&4294967295|I>>>26),I=P+(D^(E|~v))+R[15]+4264355552&4294967295,P=E+(I<<10&4294967295|I>>>22),I=v+(E^(P|~D))+R[6]+2734768916&4294967295,v=P+(I<<15&4294967295|I>>>17),I=D+(P^(v|~E))+R[13]+1309151649&4294967295,D=v+(I<<21&4294967295|I>>>11),I=E+(v^(D|~P))+R[4]+4149444226&4294967295,E=D+(I<<6&4294967295|I>>>26),I=P+(D^(E|~v))+R[11]+3174756917&4294967295,P=E+(I<<10&4294967295|I>>>22),I=v+(E^(P|~D))+R[2]+718787259&4294967295,v=P+(I<<15&4294967295|I>>>17),I=D+(P^(v|~E))+R[9]+3951481745&4294967295,T.g[0]=T.g[0]+E&4294967295,T.g[1]=T.g[1]+(v+(I<<21&4294967295|I>>>11))&4294967295,T.g[2]=T.g[2]+v&4294967295,T.g[3]=T.g[3]+P&4294967295}n.prototype.v=function(T,E){E===void 0&&(E=T.length);const D=E-this.blockSize,R=this.C;let v=this.h,P=0;for(;P<E;){if(v==0)for(;P<=D;)s(this,T,P),P+=this.blockSize;if(typeof T=="string"){for(;P<E;)if(R[v++]=T.charCodeAt(P++),v==this.blockSize){s(this,R),v=0;break}}else for(;P<E;)if(R[v++]=T[P++],v==this.blockSize){s(this,R),v=0;break}}this.h=v,this.o+=E},n.prototype.A=function(){var T=Array((this.h<56?this.blockSize:this.blockSize*2)-this.h);T[0]=128;for(var E=1;E<T.length-8;++E)T[E]=0;E=this.o*8;for(var D=T.length-8;D<T.length;++D)T[D]=E&255,E/=256;for(this.v(T),T=Array(16),E=0,D=0;D<4;++D)for(let R=0;R<32;R+=8)T[E++]=this.g[D]>>>R&255;return T};function i(T,E){var D=a;return Object.prototype.hasOwnProperty.call(D,T)?D[T]:D[T]=E(T)}function o(T,E){this.h=E;const D=[];let R=!0;for(let v=T.length-1;v>=0;v--){const P=T[v]|0;R&&P==E||(D[v]=P,R=!1)}this.g=D}var a={};function c(T){return-128<=T&&T<128?i(T,function(E){return new o([E|0],E<0?-1:0)}):new o([T|0],T<0?-1:0)}function l(T){if(isNaN(T)||!isFinite(T))return f;if(T<0)return V(l(-T));const E=[];let D=1;for(let R=0;T>=D;R++)E[R]=T/D|0,D*=4294967296;return new o(E,0)}function B(T,E){if(T.length==0)throw Error("number format error: empty string");if(E=E||10,E<2||36<E)throw Error("radix out of range: "+E);if(T.charAt(0)=="-")return V(B(T.substring(1),E));if(T.indexOf("-")>=0)throw Error('number format error: interior "-" character');const D=l(Math.pow(E,8));let R=f;for(let P=0;P<T.length;P+=8){var v=Math.min(8,T.length-P);const I=parseInt(T.substring(P,P+v),E);v<8?(v=l(Math.pow(E,v)),R=R.j(v).add(l(I))):(R=R.j(D),R=R.add(l(I)))}return R}var f=c(0),p=c(1),m=c(16777216);r=o.prototype,r.m=function(){if(F(this))return-V(this).m();let T=0,E=1;for(let D=0;D<this.g.length;D++){const R=this.i(D);T+=(R>=0?R:4294967296+R)*E,E*=4294967296}return T},r.toString=function(T){if(T=T||10,T<2||36<T)throw Error("radix out of range: "+T);if(y(this))return"0";if(F(this))return"-"+V(this).toString(T);const E=l(Math.pow(T,6));var D=this;let R="";for(;;){const v=se(D,E).g;D=j(D,v.j(E));let P=((D.g.length>0?D.g[0]:D.h)>>>0).toString(T);if(D=v,y(D))return P+R;for(;P.length<6;)P="0"+P;R=P+R}},r.i=function(T){return T<0?0:T<this.g.length?this.g[T]:this.h};function y(T){if(T.h!=0)return!1;for(let E=0;E<T.g.length;E++)if(T.g[E]!=0)return!1;return!0}function F(T){return T.h==-1}r.l=function(T){return T=j(this,T),F(T)?-1:y(T)?0:1};function V(T){const E=T.g.length,D=[];for(let R=0;R<E;R++)D[R]=~T.g[R];return new o(D,~T.h).add(p)}r.abs=function(){return F(this)?V(this):this},r.add=function(T){const E=Math.max(this.g.length,T.g.length),D=[];let R=0;for(let v=0;v<=E;v++){let P=R+(this.i(v)&65535)+(T.i(v)&65535),I=(P>>>16)+(this.i(v)>>>16)+(T.i(v)>>>16);R=I>>>16,P&=65535,I&=65535,D[v]=I<<16|P}return new o(D,D[D.length-1]&-2147483648?-1:0)};function j(T,E){return T.add(V(E))}r.j=function(T){if(y(this)||y(T))return f;if(F(this))return F(T)?V(this).j(V(T)):V(V(this).j(T));if(F(T))return V(this.j(V(T)));if(this.l(m)<0&&T.l(m)<0)return l(this.m()*T.m());const E=this.g.length+T.g.length,D=[];for(var R=0;R<2*E;R++)D[R]=0;for(R=0;R<this.g.length;R++)for(let v=0;v<T.g.length;v++){const P=this.i(R)>>>16,I=this.i(R)&65535,pt=T.i(v)>>>16,Or=T.i(v)&65535;D[2*R+2*v]+=I*Or,Y(D,2*R+2*v),D[2*R+2*v+1]+=P*Or,Y(D,2*R+2*v+1),D[2*R+2*v+1]+=I*pt,Y(D,2*R+2*v+1),D[2*R+2*v+2]+=P*pt,Y(D,2*R+2*v+2)}for(T=0;T<E;T++)D[T]=D[2*T+1]<<16|D[2*T];for(T=E;T<2*E;T++)D[T]=0;return new o(D,0)};function Y(T,E){for(;(T[E]&65535)!=T[E];)T[E+1]+=T[E]>>>16,T[E]&=65535,E++}function ee(T,E){this.g=T,this.h=E}function se(T,E){if(y(E))throw Error("division by zero");if(y(T))return new ee(f,f);if(F(T))return E=se(V(T),E),new ee(V(E.g),V(E.h));if(F(E))return E=se(T,V(E)),new ee(V(E.g),E.h);if(T.g.length>30){if(F(T)||F(E))throw Error("slowDivide_ only works with positive integers.");for(var D=p,R=E;R.l(T)<=0;)D=fe(D),R=fe(R);var v=oe(D,1),P=oe(R,1);for(R=oe(R,2),D=oe(D,2);!y(R);){var I=P.add(R);I.l(T)<=0&&(v=v.add(D),P=I),R=oe(R,1),D=oe(D,1)}return E=j(T,v.j(E)),new ee(v,E)}for(v=f;T.l(E)>=0;){for(D=Math.max(1,Math.floor(T.m()/E.m())),R=Math.ceil(Math.log(D)/Math.LN2),R=R<=48?1:Math.pow(2,R-48),P=l(D),I=P.j(E);F(I)||I.l(T)>0;)D-=R,P=l(D),I=P.j(E);y(P)&&(P=p),v=v.add(P),T=j(T,I)}return new ee(v,T)}r.B=function(T){return se(this,T).h},r.and=function(T){const E=Math.max(this.g.length,T.g.length),D=[];for(let R=0;R<E;R++)D[R]=this.i(R)&T.i(R);return new o(D,this.h&T.h)},r.or=function(T){const E=Math.max(this.g.length,T.g.length),D=[];for(let R=0;R<E;R++)D[R]=this.i(R)|T.i(R);return new o(D,this.h|T.h)},r.xor=function(T){const E=Math.max(this.g.length,T.g.length),D=[];for(let R=0;R<E;R++)D[R]=this.i(R)^T.i(R);return new o(D,this.h^T.h)};function fe(T){const E=T.g.length+1,D=[];for(let R=0;R<E;R++)D[R]=T.i(R)<<1|T.i(R-1)>>>31;return new o(D,T.h)}function oe(T,E){const D=E>>5;E%=32;const R=T.g.length-D,v=[];for(let P=0;P<R;P++)v[P]=E>0?T.i(P+D)>>>E|T.i(P+D+1)<<32-E:T.i(P+D);return new o(v,T.h)}n.prototype.digest=n.prototype.A,n.prototype.reset=n.prototype.u,n.prototype.update=n.prototype.v,_m=n,o.prototype.add=o.prototype.add,o.prototype.multiply=o.prototype.j,o.prototype.modulo=o.prototype.B,o.prototype.compare=o.prototype.l,o.prototype.toNumber=o.prototype.m,o.prototype.toString=o.prototype.toString,o.prototype.getBits=o.prototype.i,o.fromNumber=l,o.fromString=B,hr=o}).apply(typeof Bp<"u"?Bp:typeof self<"u"?self:typeof window<"u"?window:{});var xa=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var Em,io,Im,nc,Xl,Dm,ym,Tm;(function(){var r,e=Object.defineProperty;function t(u){u=[typeof globalThis=="object"&&globalThis,u,typeof window=="object"&&window,typeof self=="object"&&self,typeof xa=="object"&&xa];for(var h=0;h<u.length;++h){var d=u[h];if(d&&d.Math==Math)return d}throw Error("Cannot find global object")}var n=t(this);function s(u,h){if(h)e:{var d=n;u=u.split(".");for(var C=0;C<u.length-1;C++){var S=u[C];if(!(S in d))break e;d=d[S]}u=u[u.length-1],C=d[u],h=h(C),h!=C&&h!=null&&e(d,u,{configurable:!0,writable:!0,value:h})}}s("Symbol.dispose",function(u){return u||Symbol("Symbol.dispose")}),s("Array.prototype.values",function(u){return u||function(){return this[Symbol.iterator]()}}),s("Object.entries",function(u){return u||function(h){var d=[],C;for(C in h)Object.prototype.hasOwnProperty.call(h,C)&&d.push([C,h[C]]);return d}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var i=i||{},o=this||self;function a(u){var h=typeof u;return h=="object"&&u!=null||h=="function"}function c(u,h,d){return u.call.apply(u.bind,arguments)}function l(u,h,d){return l=c,l.apply(null,arguments)}function B(u,h){var d=Array.prototype.slice.call(arguments,1);return function(){var C=d.slice();return C.push.apply(C,arguments),u.apply(this,C)}}function f(u,h){function d(){}d.prototype=h.prototype,u.Z=h.prototype,u.prototype=new d,u.prototype.constructor=u,u.Ob=function(C,S,N){for(var J=Array(arguments.length-2),ue=2;ue<arguments.length;ue++)J[ue-2]=arguments[ue];return h.prototype[S].apply(C,J)}}var p=typeof AsyncContext<"u"&&typeof AsyncContext.Snapshot=="function"?u=>u&&AsyncContext.Snapshot.wrap(u):u=>u;function m(u){const h=u.length;if(h>0){const d=Array(h);for(let C=0;C<h;C++)d[C]=u[C];return d}return[]}function y(u,h){for(let C=1;C<arguments.length;C++){const S=arguments[C];var d=typeof S;if(d=d!="object"?d:S?Array.isArray(S)?"array":d:"null",d=="array"||d=="object"&&typeof S.length=="number"){d=u.length||0;const N=S.length||0;u.length=d+N;for(let J=0;J<N;J++)u[d+J]=S[J]}else u.push(S)}}class F{constructor(h,d){this.i=h,this.j=d,this.h=0,this.g=null}get(){let h;return this.h>0?(this.h--,h=this.g,this.g=h.next,h.next=null):h=this.i(),h}}function V(u){o.setTimeout(()=>{throw u},0)}function j(){var u=T;let h=null;return u.g&&(h=u.g,u.g=u.g.next,u.g||(u.h=null),h.next=null),h}class Y{constructor(){this.h=this.g=null}add(h,d){const C=ee.get();C.set(h,d),this.h?this.h.next=C:this.g=C,this.h=C}}var ee=new F(()=>new se,u=>u.reset());class se{constructor(){this.next=this.g=this.h=null}set(h,d){this.h=h,this.g=d,this.next=null}reset(){this.next=this.g=this.h=null}}let fe,oe=!1,T=new Y,E=()=>{const u=Promise.resolve(void 0);fe=()=>{u.then(D)}};function D(){for(var u;u=j();){try{u.h.call(u.g)}catch(d){V(d)}var h=ee;h.j(u),h.h<100&&(h.h++,u.next=h.g,h.g=u)}oe=!1}function R(){this.u=this.u,this.C=this.C}R.prototype.u=!1,R.prototype.dispose=function(){this.u||(this.u=!0,this.N())},R.prototype[Symbol.dispose]=function(){this.dispose()},R.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function v(u,h){this.type=u,this.g=this.target=h,this.defaultPrevented=!1}v.prototype.h=function(){this.defaultPrevented=!0};var P=(function(){if(!o.addEventListener||!Object.defineProperty)return!1;var u=!1,h=Object.defineProperty({},"passive",{get:function(){u=!0}});try{const d=()=>{};o.addEventListener("test",d,h),o.removeEventListener("test",d,h)}catch{}return u})();function I(u){return/^[\s\xa0]*$/.test(u)}function pt(u,h){v.call(this,u?u.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,u&&this.init(u,h)}f(pt,v),pt.prototype.init=function(u,h){const d=this.type=u.type,C=u.changedTouches&&u.changedTouches.length?u.changedTouches[0]:null;this.target=u.target||u.srcElement,this.g=h,h=u.relatedTarget,h||(d=="mouseover"?h=u.fromElement:d=="mouseout"&&(h=u.toElement)),this.relatedTarget=h,C?(this.clientX=C.clientX!==void 0?C.clientX:C.pageX,this.clientY=C.clientY!==void 0?C.clientY:C.pageY,this.screenX=C.screenX||0,this.screenY=C.screenY||0):(this.clientX=u.clientX!==void 0?u.clientX:u.pageX,this.clientY=u.clientY!==void 0?u.clientY:u.pageY,this.screenX=u.screenX||0,this.screenY=u.screenY||0),this.button=u.button,this.key=u.key||"",this.ctrlKey=u.ctrlKey,this.altKey=u.altKey,this.shiftKey=u.shiftKey,this.metaKey=u.metaKey,this.pointerId=u.pointerId||0,this.pointerType=u.pointerType,this.state=u.state,this.i=u,u.defaultPrevented&&pt.Z.h.call(this)},pt.prototype.h=function(){pt.Z.h.call(this);const u=this.i;u.preventDefault?u.preventDefault():u.returnValue=!1};var Or="closure_listenable_"+(Math.random()*1e6|0),ey=0;function ty(u,h,d,C,S){this.listener=u,this.proxy=null,this.src=h,this.type=d,this.capture=!!C,this.ha=S,this.key=++ey,this.da=this.fa=!1}function Da(u){u.da=!0,u.listener=null,u.proxy=null,u.src=null,u.ha=null}function ya(u,h,d){for(const C in u)h.call(d,u[C],C,u)}function ny(u,h){for(const d in u)h.call(void 0,u[d],d,u)}function Zf(u){const h={};for(const d in u)h[d]=u[d];return h}const ed="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function td(u,h){let d,C;for(let S=1;S<arguments.length;S++){C=arguments[S];for(d in C)u[d]=C[d];for(let N=0;N<ed.length;N++)d=ed[N],Object.prototype.hasOwnProperty.call(C,d)&&(u[d]=C[d])}}function Ta(u){this.src=u,this.g={},this.h=0}Ta.prototype.add=function(u,h,d,C,S){const N=u.toString();u=this.g[N],u||(u=this.g[N]=[],this.h++);const J=zu(u,h,C,S);return J>-1?(h=u[J],d||(h.fa=!1)):(h=new ty(h,this.src,N,!!C,S),h.fa=d,u.push(h)),h};function Ju(u,h){const d=h.type;if(d in u.g){var C=u.g[d],S=Array.prototype.indexOf.call(C,h,void 0),N;(N=S>=0)&&Array.prototype.splice.call(C,S,1),N&&(Da(h),u.g[d].length==0&&(delete u.g[d],u.h--))}}function zu(u,h,d,C){for(let S=0;S<u.length;++S){const N=u[S];if(!N.da&&N.listener==h&&N.capture==!!d&&N.ha==C)return S}return-1}var $u="closure_lm_"+(Math.random()*1e6|0),Qu={};function nd(u,h,d,C,S){if(Array.isArray(h)){for(let N=0;N<h.length;N++)nd(u,h[N],d,C,S);return null}return d=id(d),u&&u[Or]?u.J(h,d,a(C)?!!C.capture:!1,S):ry(u,h,d,!1,C,S)}function ry(u,h,d,C,S,N){if(!h)throw Error("Invalid event type");const J=a(S)?!!S.capture:!!S;let ue=Yu(u);if(ue||(u[$u]=ue=new Ta(u)),d=ue.add(h,d,C,J,N),d.proxy)return d;if(C=sy(),d.proxy=C,C.src=u,C.listener=d,u.addEventListener)P||(S=J),S===void 0&&(S=!1),u.addEventListener(h.toString(),C,S);else if(u.attachEvent)u.attachEvent(sd(h.toString()),C);else if(u.addListener&&u.removeListener)u.addListener(C);else throw Error("addEventListener and attachEvent are unavailable.");return d}function sy(){function u(d){return h.call(u.src,u.listener,d)}const h=iy;return u}function rd(u,h,d,C,S){if(Array.isArray(h))for(var N=0;N<h.length;N++)rd(u,h[N],d,C,S);else C=a(C)?!!C.capture:!!C,d=id(d),u&&u[Or]?(u=u.i,N=String(h).toString(),N in u.g&&(h=u.g[N],d=zu(h,d,C,S),d>-1&&(Da(h[d]),Array.prototype.splice.call(h,d,1),h.length==0&&(delete u.g[N],u.h--)))):u&&(u=Yu(u))&&(h=u.g[h.toString()],u=-1,h&&(u=zu(h,d,C,S)),(d=u>-1?h[u]:null)&&Wu(d))}function Wu(u){if(typeof u!="number"&&u&&!u.da){var h=u.src;if(h&&h[Or])Ju(h.i,u);else{var d=u.type,C=u.proxy;h.removeEventListener?h.removeEventListener(d,C,u.capture):h.detachEvent?h.detachEvent(sd(d),C):h.addListener&&h.removeListener&&h.removeListener(C),(d=Yu(h))?(Ju(d,u),d.h==0&&(d.src=null,h[$u]=null)):Da(u)}}}function sd(u){return u in Qu?Qu[u]:Qu[u]="on"+u}function iy(u,h){if(u.da)u=!0;else{h=new pt(h,this);const d=u.listener,C=u.ha||u.src;u.fa&&Wu(u),u=d.call(C,h)}return u}function Yu(u){return u=u[$u],u instanceof Ta?u:null}var Xu="__closure_events_fn_"+(Math.random()*1e9>>>0);function id(u){return typeof u=="function"?u:(u[Xu]||(u[Xu]=function(h){return u.handleEvent(h)}),u[Xu])}function Ze(){R.call(this),this.i=new Ta(this),this.M=this,this.G=null}f(Ze,R),Ze.prototype[Or]=!0,Ze.prototype.removeEventListener=function(u,h,d,C){rd(this,u,h,d,C)};function ut(u,h){var d,C=u.G;if(C)for(d=[];C;C=C.G)d.push(C);if(u=u.M,C=h.type||h,typeof h=="string")h=new v(h,u);else if(h instanceof v)h.target=h.target||u;else{var S=h;h=new v(C,u),td(h,S)}S=!0;let N,J;if(d)for(J=d.length-1;J>=0;J--)N=h.g=d[J],S=wa(N,C,!0,h)&&S;if(N=h.g=u,S=wa(N,C,!0,h)&&S,S=wa(N,C,!1,h)&&S,d)for(J=0;J<d.length;J++)N=h.g=d[J],S=wa(N,C,!1,h)&&S}Ze.prototype.N=function(){if(Ze.Z.N.call(this),this.i){var u=this.i;for(const h in u.g){const d=u.g[h];for(let C=0;C<d.length;C++)Da(d[C]);delete u.g[h],u.h--}}this.G=null},Ze.prototype.J=function(u,h,d,C){return this.i.add(String(u),h,!1,d,C)},Ze.prototype.K=function(u,h,d,C){return this.i.add(String(u),h,!0,d,C)};function wa(u,h,d,C){if(h=u.i.g[String(h)],!h)return!0;h=h.concat();let S=!0;for(let N=0;N<h.length;++N){const J=h[N];if(J&&!J.da&&J.capture==d){const ue=J.listener,Ve=J.ha||J.src;J.fa&&Ju(u.i,J),S=ue.call(Ve,C)!==!1&&S}}return S&&!C.defaultPrevented}function oy(u,h){if(typeof u!="function")if(u&&typeof u.handleEvent=="function")u=l(u.handleEvent,u);else throw Error("Invalid listener argument");return Number(h)>2147483647?-1:o.setTimeout(u,h||0)}function od(u){u.g=oy(()=>{u.g=null,u.i&&(u.i=!1,od(u))},u.l);const h=u.h;u.h=null,u.m.apply(null,h)}class ay extends R{constructor(h,d){super(),this.m=h,this.l=d,this.h=null,this.i=!1,this.g=null}j(h){this.h=arguments,this.g?this.i=!0:od(this)}N(){super.N(),this.g&&(o.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function Fi(u){R.call(this),this.h=u,this.g={}}f(Fi,R);var ad=[];function cd(u){ya(u.g,function(h,d){this.g.hasOwnProperty(d)&&Wu(h)},u),u.g={}}Fi.prototype.N=function(){Fi.Z.N.call(this),cd(this)},Fi.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var Zu=o.JSON.stringify,cy=o.JSON.parse,uy=class{stringify(u){return o.JSON.stringify(u,void 0)}parse(u){return o.JSON.parse(u,void 0)}};function ud(){}function ld(){}var Li={OPEN:"a",hb:"b",ERROR:"c",tb:"d"};function el(){v.call(this,"d")}f(el,v);function tl(){v.call(this,"c")}f(tl,v);var Fr={},Bd=null;function Aa(){return Bd=Bd||new Ze}Fr.Ia="serverreachability";function hd(u){v.call(this,Fr.Ia,u)}f(hd,v);function ki(u){const h=Aa();ut(h,new hd(h))}Fr.STAT_EVENT="statevent";function fd(u,h){v.call(this,Fr.STAT_EVENT,u),this.stat=h}f(fd,v);function lt(u){const h=Aa();ut(h,new fd(h,u))}Fr.Ja="timingevent";function dd(u,h){v.call(this,Fr.Ja,u),this.size=h}f(dd,v);function xi(u,h){if(typeof u!="function")throw Error("Fn must not be null and must be a function");return o.setTimeout(function(){u()},h)}function Vi(){this.g=!0}Vi.prototype.ua=function(){this.g=!1};function ly(u,h,d,C,S,N){u.info(function(){if(u.g)if(N){var J="",ue=N.split("&");for(let Ee=0;Ee<ue.length;Ee++){var Ve=ue[Ee].split("=");if(Ve.length>1){const je=Ve[0];Ve=Ve[1];const nn=je.split("_");J=nn.length>=2&&nn[1]=="type"?J+(je+"="+Ve+"&"):J+(je+"=redacted&")}}}else J=null;else J=N;return"XMLHTTP REQ ("+C+") [attempt "+S+"]: "+h+`
`+d+`
`+J})}function By(u,h,d,C,S,N,J){u.info(function(){return"XMLHTTP RESP ("+C+") [ attempt "+S+"]: "+h+`
`+d+`
`+N+" "+J})}function As(u,h,d,C){u.info(function(){return"XMLHTTP TEXT ("+h+"): "+fy(u,d)+(C?" "+C:"")})}function hy(u,h){u.info(function(){return"TIMEOUT: "+h})}Vi.prototype.info=function(){};function fy(u,h){if(!u.g)return h;if(!h)return null;try{const N=JSON.parse(h);if(N){for(u=0;u<N.length;u++)if(Array.isArray(N[u])){var d=N[u];if(!(d.length<2)){var C=d[1];if(Array.isArray(C)&&!(C.length<1)){var S=C[0];if(S!="noop"&&S!="stop"&&S!="close")for(let J=1;J<C.length;J++)C[J]=""}}}}return Zu(N)}catch{return h}}var va={NO_ERROR:0,cb:1,qb:2,pb:3,kb:4,ob:5,rb:6,Ga:7,TIMEOUT:8,ub:9},pd={ib:"complete",Fb:"success",ERROR:"error",Ga:"abort",xb:"ready",yb:"readystatechange",TIMEOUT:"timeout",sb:"incrementaldata",wb:"progress",lb:"downloadprogress",Nb:"uploadprogress"},Cd;function nl(){}f(nl,ud),nl.prototype.g=function(){return new XMLHttpRequest},Cd=new nl;function Mi(u){return encodeURIComponent(String(u))}function dy(u){var h=1;u=u.split(":");const d=[];for(;h>0&&u.length;)d.push(u.shift()),h--;return u.length&&d.push(u.join(":")),d}function Hn(u,h,d,C){this.j=u,this.i=h,this.l=d,this.S=C||1,this.V=new Fi(this),this.H=45e3,this.J=null,this.o=!1,this.u=this.B=this.A=this.M=this.F=this.T=this.D=null,this.G=[],this.g=null,this.C=0,this.m=this.v=null,this.X=-1,this.K=!1,this.P=0,this.O=null,this.W=this.L=this.U=this.R=!1,this.h=new gd}function gd(){this.i=null,this.g="",this.h=!1}var md={},rl={};function sl(u,h,d){u.M=1,u.A=ba(tn(h)),u.u=d,u.R=!0,_d(u,null)}function _d(u,h){u.F=Date.now(),Ra(u),u.B=tn(u.A);var d=u.B,C=u.S;Array.isArray(C)||(C=[String(C)]),Nd(d.i,"t",C),u.C=0,d=u.j.L,u.h=new gd,u.g=Wd(u.j,d?h:null,!u.u),u.P>0&&(u.O=new ay(l(u.Y,u,u.g),u.P)),h=u.V,d=u.g,C=u.ba;var S="readystatechange";Array.isArray(S)||(S&&(ad[0]=S.toString()),S=ad);for(let N=0;N<S.length;N++){const J=nd(d,S[N],C||h.handleEvent,!1,h.h||h);if(!J)break;h.g[J.key]=J}h=u.J?Zf(u.J):{},u.u?(u.v||(u.v="POST"),h["Content-Type"]="application/x-www-form-urlencoded",u.g.ea(u.B,u.v,u.u,h)):(u.v="GET",u.g.ea(u.B,u.v,null,h)),ki(),ly(u.i,u.v,u.B,u.l,u.S,u.u)}Hn.prototype.ba=function(u){u=u.target;const h=this.O;h&&Kn(u)==3?h.j():this.Y(u)},Hn.prototype.Y=function(u){try{if(u==this.g)e:{const ue=Kn(this.g),Ve=this.g.ya(),Ee=this.g.ca();if(!(ue<3)&&(ue!=3||this.g&&(this.h.h||this.g.la()||Md(this.g)))){this.K||ue!=4||Ve==7||(Ve==8||Ee<=0?ki(3):ki(2)),il(this);var h=this.g.ca();this.X=h;var d=py(this);if(this.o=h==200,By(this.i,this.v,this.B,this.l,this.S,ue,h),this.o){if(this.U&&!this.L){t:{if(this.g){var C,S=this.g;if((C=S.g?S.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!I(C)){var N=C;break t}}N=null}if(u=N)As(this.i,this.l,u,"Initial handshake response via X-HTTP-Initial-Response"),this.L=!0,ol(this,u);else{this.o=!1,this.m=3,lt(12),Lr(this),Gi(this);break e}}if(this.R){u=!0;let je;for(;!this.K&&this.C<d.length;)if(je=Cy(this,d),je==rl){ue==4&&(this.m=4,lt(14),u=!1),As(this.i,this.l,null,"[Incomplete Response]");break}else if(je==md){this.m=4,lt(15),As(this.i,this.l,d,"[Invalid Chunk]"),u=!1;break}else As(this.i,this.l,je,null),ol(this,je);if(Ed(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),ue!=4||d.length!=0||this.h.h||(this.m=1,lt(16),u=!1),this.o=this.o&&u,!u)As(this.i,this.l,d,"[Invalid Chunked Response]"),Lr(this),Gi(this);else if(d.length>0&&!this.W){this.W=!0;var J=this.j;J.g==this&&J.aa&&!J.P&&(J.j.info("Great, no buffering proxy detected. Bytes received: "+d.length),dl(J),J.P=!0,lt(11))}}else As(this.i,this.l,d,null),ol(this,d);ue==4&&Lr(this),this.o&&!this.K&&(ue==4?Jd(this.j,this):(this.o=!1,Ra(this)))}else Sy(this.g),h==400&&d.indexOf("Unknown SID")>0?(this.m=3,lt(12)):(this.m=0,lt(13)),Lr(this),Gi(this)}}}catch{}finally{}};function py(u){if(!Ed(u))return u.g.la();const h=Md(u.g);if(h==="")return"";let d="";const C=h.length,S=Kn(u.g)==4;if(!u.h.i){if(typeof TextDecoder>"u")return Lr(u),Gi(u),"";u.h.i=new o.TextDecoder}for(let N=0;N<C;N++)u.h.h=!0,d+=u.h.i.decode(h[N],{stream:!(S&&N==C-1)});return h.length=0,u.h.g+=d,u.C=0,u.h.g}function Ed(u){return u.g?u.v=="GET"&&u.M!=2&&u.j.Aa:!1}function Cy(u,h){var d=u.C,C=h.indexOf(`
`,d);return C==-1?rl:(d=Number(h.substring(d,C)),isNaN(d)?md:(C+=1,C+d>h.length?rl:(h=h.slice(C,C+d),u.C=C+d,h)))}Hn.prototype.cancel=function(){this.K=!0,Lr(this)};function Ra(u){u.T=Date.now()+u.H,Id(u,u.H)}function Id(u,h){if(u.D!=null)throw Error("WatchDog timer not null");u.D=xi(l(u.aa,u),h)}function il(u){u.D&&(o.clearTimeout(u.D),u.D=null)}Hn.prototype.aa=function(){this.D=null;const u=Date.now();u-this.T>=0?(hy(this.i,this.B),this.M!=2&&(ki(),lt(17)),Lr(this),this.m=2,Gi(this)):Id(this,this.T-u)};function Gi(u){u.j.I==0||u.K||Jd(u.j,u)}function Lr(u){il(u);var h=u.O;h&&typeof h.dispose=="function"&&h.dispose(),u.O=null,cd(u.V),u.g&&(h=u.g,u.g=null,h.abort(),h.dispose())}function ol(u,h){try{var d=u.j;if(d.I!=0&&(d.g==u||al(d.h,u))){if(!u.L&&al(d.h,u)&&d.I==3){try{var C=d.Ba.g.parse(h)}catch{C=null}if(Array.isArray(C)&&C.length==3){var S=C;if(S[0]==0){e:if(!d.v){if(d.g)if(d.g.F+3e3<u.F)Fa(d),Na(d);else break e;fl(d),lt(18)}}else d.xa=S[1],0<d.xa-d.K&&S[2]<37500&&d.F&&d.A==0&&!d.C&&(d.C=xi(l(d.Va,d),6e3));Td(d.h)<=1&&d.ta&&(d.ta=void 0)}else xr(d,11)}else if((u.L||d.g==u)&&Fa(d),!I(h))for(S=d.Ba.g.parse(h),h=0;h<S.length;h++){let Ee=S[h];const je=Ee[0];if(!(je<=d.K))if(d.K=je,Ee=Ee[1],d.I==2)if(Ee[0]=="c"){d.M=Ee[1],d.ba=Ee[2];const nn=Ee[3];nn!=null&&(d.ka=nn,d.j.info("VER="+d.ka));const Vr=Ee[4];Vr!=null&&(d.za=Vr,d.j.info("SVER="+d.za));const Jn=Ee[5];Jn!=null&&typeof Jn=="number"&&Jn>0&&(C=1.5*Jn,d.O=C,d.j.info("backChannelRequestTimeoutMs_="+C)),C=d;const zn=u.g;if(zn){const ka=zn.g?zn.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(ka){var N=C.h;N.g||ka.indexOf("spdy")==-1&&ka.indexOf("quic")==-1&&ka.indexOf("h2")==-1||(N.j=N.l,N.g=new Set,N.h&&(cl(N,N.h),N.h=null))}if(C.G){const pl=zn.g?zn.g.getResponseHeader("X-HTTP-Session-Id"):null;pl&&(C.wa=pl,Te(C.J,C.G,pl))}}d.I=3,d.l&&d.l.ra(),d.aa&&(d.T=Date.now()-u.F,d.j.info("Handshake RTT: "+d.T+"ms")),C=d;var J=u;if(C.na=Qd(C,C.L?C.ba:null,C.W),J.L){wd(C.h,J);var ue=J,Ve=C.O;Ve&&(ue.H=Ve),ue.D&&(il(ue),Ra(ue)),C.g=J}else jd(C);d.i.length>0&&Oa(d)}else Ee[0]!="stop"&&Ee[0]!="close"||xr(d,7);else d.I==3&&(Ee[0]=="stop"||Ee[0]=="close"?Ee[0]=="stop"?xr(d,7):hl(d):Ee[0]!="noop"&&d.l&&d.l.qa(Ee),d.A=0)}}ki(4)}catch{}}var gy=class{constructor(u,h){this.g=u,this.map=h}};function Dd(u){this.l=u||10,o.PerformanceNavigationTiming?(u=o.performance.getEntriesByType("navigation"),u=u.length>0&&(u[0].nextHopProtocol=="hq"||u[0].nextHopProtocol=="h2")):u=!!(o.chrome&&o.chrome.loadTimes&&o.chrome.loadTimes()&&o.chrome.loadTimes().wasFetchedViaSpdy),this.j=u?this.l:1,this.g=null,this.j>1&&(this.g=new Set),this.h=null,this.i=[]}function yd(u){return u.h?!0:u.g?u.g.size>=u.j:!1}function Td(u){return u.h?1:u.g?u.g.size:0}function al(u,h){return u.h?u.h==h:u.g?u.g.has(h):!1}function cl(u,h){u.g?u.g.add(h):u.h=h}function wd(u,h){u.h&&u.h==h?u.h=null:u.g&&u.g.has(h)&&u.g.delete(h)}Dd.prototype.cancel=function(){if(this.i=Ad(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const u of this.g.values())u.cancel();this.g.clear()}};function Ad(u){if(u.h!=null)return u.i.concat(u.h.G);if(u.g!=null&&u.g.size!==0){let h=u.i;for(const d of u.g.values())h=h.concat(d.G);return h}return m(u.i)}var vd=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function my(u,h){if(u){u=u.split("&");for(let d=0;d<u.length;d++){const C=u[d].indexOf("=");let S,N=null;C>=0?(S=u[d].substring(0,C),N=u[d].substring(C+1)):S=u[d],h(S,N?decodeURIComponent(N.replace(/\+/g," ")):"")}}}function qn(u){this.g=this.o=this.j="",this.u=null,this.m=this.h="",this.l=!1;let h;u instanceof qn?(this.l=u.l,Ui(this,u.j),this.o=u.o,this.g=u.g,Hi(this,u.u),this.h=u.h,ul(this,Od(u.i)),this.m=u.m):u&&(h=String(u).match(vd))?(this.l=!1,Ui(this,h[1]||"",!0),this.o=qi(h[2]||""),this.g=qi(h[3]||"",!0),Hi(this,h[4]),this.h=qi(h[5]||"",!0),ul(this,h[6]||"",!0),this.m=qi(h[7]||"")):(this.l=!1,this.i=new Ki(null,this.l))}qn.prototype.toString=function(){const u=[];var h=this.j;h&&u.push(ji(h,Rd,!0),":");var d=this.g;return(d||h=="file")&&(u.push("//"),(h=this.o)&&u.push(ji(h,Rd,!0),"@"),u.push(Mi(d).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),d=this.u,d!=null&&u.push(":",String(d))),(d=this.h)&&(this.g&&d.charAt(0)!="/"&&u.push("/"),u.push(ji(d,d.charAt(0)=="/"?Iy:Ey,!0))),(d=this.i.toString())&&u.push("?",d),(d=this.m)&&u.push("#",ji(d,yy)),u.join("")},qn.prototype.resolve=function(u){const h=tn(this);let d=!!u.j;d?Ui(h,u.j):d=!!u.o,d?h.o=u.o:d=!!u.g,d?h.g=u.g:d=u.u!=null;var C=u.h;if(d)Hi(h,u.u);else if(d=!!u.h){if(C.charAt(0)!="/")if(this.g&&!this.h)C="/"+C;else{var S=h.h.lastIndexOf("/");S!=-1&&(C=h.h.slice(0,S+1)+C)}if(S=C,S==".."||S==".")C="";else if(S.indexOf("./")!=-1||S.indexOf("/.")!=-1){C=S.lastIndexOf("/",0)==0,S=S.split("/");const N=[];for(let J=0;J<S.length;){const ue=S[J++];ue=="."?C&&J==S.length&&N.push(""):ue==".."?((N.length>1||N.length==1&&N[0]!="")&&N.pop(),C&&J==S.length&&N.push("")):(N.push(ue),C=!0)}C=N.join("/")}else C=S}return d?h.h=C:d=u.i.toString()!=="",d?ul(h,Od(u.i)):d=!!u.m,d&&(h.m=u.m),h};function tn(u){return new qn(u)}function Ui(u,h,d){u.j=d?qi(h,!0):h,u.j&&(u.j=u.j.replace(/:$/,""))}function Hi(u,h){if(h){if(h=Number(h),isNaN(h)||h<0)throw Error("Bad port number "+h);u.u=h}else u.u=null}function ul(u,h,d){h instanceof Ki?(u.i=h,Ty(u.i,u.l)):(d||(h=ji(h,Dy)),u.i=new Ki(h,u.l))}function Te(u,h,d){u.i.set(h,d)}function ba(u){return Te(u,"zx",Math.floor(Math.random()*2147483648).toString(36)+Math.abs(Math.floor(Math.random()*2147483648)^Date.now()).toString(36)),u}function qi(u,h){return u?h?decodeURI(u.replace(/%25/g,"%2525")):decodeURIComponent(u):""}function ji(u,h,d){return typeof u=="string"?(u=encodeURI(u).replace(h,_y),d&&(u=u.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),u):null}function _y(u){return u=u.charCodeAt(0),"%"+(u>>4&15).toString(16)+(u&15).toString(16)}var Rd=/[#\/\?@]/g,Ey=/[#\?:]/g,Iy=/[#\?]/g,Dy=/[#\?@]/g,yy=/#/g;function Ki(u,h){this.h=this.g=null,this.i=u||null,this.j=!!h}function kr(u){u.g||(u.g=new Map,u.h=0,u.i&&my(u.i,function(h,d){u.add(decodeURIComponent(h.replace(/\+/g," ")),d)}))}r=Ki.prototype,r.add=function(u,h){kr(this),this.i=null,u=vs(this,u);let d=this.g.get(u);return d||this.g.set(u,d=[]),d.push(h),this.h+=1,this};function bd(u,h){kr(u),h=vs(u,h),u.g.has(h)&&(u.i=null,u.h-=u.g.get(h).length,u.g.delete(h))}function Sd(u,h){return kr(u),h=vs(u,h),u.g.has(h)}r.forEach=function(u,h){kr(this),this.g.forEach(function(d,C){d.forEach(function(S){u.call(h,S,C,this)},this)},this)};function Pd(u,h){kr(u);let d=[];if(typeof h=="string")Sd(u,h)&&(d=d.concat(u.g.get(vs(u,h))));else for(u=Array.from(u.g.values()),h=0;h<u.length;h++)d=d.concat(u[h]);return d}r.set=function(u,h){return kr(this),this.i=null,u=vs(this,u),Sd(this,u)&&(this.h-=this.g.get(u).length),this.g.set(u,[h]),this.h+=1,this},r.get=function(u,h){return u?(u=Pd(this,u),u.length>0?String(u[0]):h):h};function Nd(u,h,d){bd(u,h),d.length>0&&(u.i=null,u.g.set(vs(u,h),m(d)),u.h+=d.length)}r.toString=function(){if(this.i)return this.i;if(!this.g)return"";const u=[],h=Array.from(this.g.keys());for(let C=0;C<h.length;C++){var d=h[C];const S=Mi(d);d=Pd(this,d);for(let N=0;N<d.length;N++){let J=S;d[N]!==""&&(J+="="+Mi(d[N])),u.push(J)}}return this.i=u.join("&")};function Od(u){const h=new Ki;return h.i=u.i,u.g&&(h.g=new Map(u.g),h.h=u.h),h}function vs(u,h){return h=String(h),u.j&&(h=h.toLowerCase()),h}function Ty(u,h){h&&!u.j&&(kr(u),u.i=null,u.g.forEach(function(d,C){const S=C.toLowerCase();C!=S&&(bd(this,C),Nd(this,S,d))},u)),u.j=h}function wy(u,h){const d=new Vi;if(o.Image){const C=new Image;C.onload=B(jn,d,"TestLoadImage: loaded",!0,h,C),C.onerror=B(jn,d,"TestLoadImage: error",!1,h,C),C.onabort=B(jn,d,"TestLoadImage: abort",!1,h,C),C.ontimeout=B(jn,d,"TestLoadImage: timeout",!1,h,C),o.setTimeout(function(){C.ontimeout&&C.ontimeout()},1e4),C.src=u}else h(!1)}function Ay(u,h){const d=new Vi,C=new AbortController,S=setTimeout(()=>{C.abort(),jn(d,"TestPingServer: timeout",!1,h)},1e4);fetch(u,{signal:C.signal}).then(N=>{clearTimeout(S),N.ok?jn(d,"TestPingServer: ok",!0,h):jn(d,"TestPingServer: server error",!1,h)}).catch(()=>{clearTimeout(S),jn(d,"TestPingServer: error",!1,h)})}function jn(u,h,d,C,S){try{S&&(S.onload=null,S.onerror=null,S.onabort=null,S.ontimeout=null),C(d)}catch{}}function vy(){this.g=new uy}function ll(u){this.i=u.Sb||null,this.h=u.ab||!1}f(ll,ud),ll.prototype.g=function(){return new Sa(this.i,this.h)};function Sa(u,h){Ze.call(this),this.H=u,this.o=h,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.A=new Headers,this.h=null,this.F="GET",this.D="",this.g=!1,this.B=this.j=this.l=null,this.v=new AbortController}f(Sa,Ze),r=Sa.prototype,r.open=function(u,h){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.F=u,this.D=h,this.readyState=1,zi(this)},r.send=function(u){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");if(this.v.signal.aborted)throw this.abort(),Error("Request was aborted.");this.g=!0;const h={headers:this.A,method:this.F,credentials:this.m,cache:void 0,signal:this.v.signal};u&&(h.body=u),(this.H||o).fetch(new Request(this.D,h)).then(this.Pa.bind(this),this.ga.bind(this))},r.abort=function(){this.response=this.responseText="",this.A=new Headers,this.status=0,this.v.abort(),this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),this.readyState>=1&&this.g&&this.readyState!=4&&(this.g=!1,Ji(this)),this.readyState=0},r.Pa=function(u){if(this.g&&(this.l=u,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=u.headers,this.readyState=2,zi(this)),this.g&&(this.readyState=3,zi(this),this.g)))if(this.responseType==="arraybuffer")u.arrayBuffer().then(this.Na.bind(this),this.ga.bind(this));else if(typeof o.ReadableStream<"u"&&"body"in u){if(this.j=u.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.B=new TextDecoder;Fd(this)}else u.text().then(this.Oa.bind(this),this.ga.bind(this))};function Fd(u){u.j.read().then(u.Ma.bind(u)).catch(u.ga.bind(u))}r.Ma=function(u){if(this.g){if(this.o&&u.value)this.response.push(u.value);else if(!this.o){var h=u.value?u.value:new Uint8Array(0);(h=this.B.decode(h,{stream:!u.done}))&&(this.response=this.responseText+=h)}u.done?Ji(this):zi(this),this.readyState==3&&Fd(this)}},r.Oa=function(u){this.g&&(this.response=this.responseText=u,Ji(this))},r.Na=function(u){this.g&&(this.response=u,Ji(this))},r.ga=function(){this.g&&Ji(this)};function Ji(u){u.readyState=4,u.l=null,u.j=null,u.B=null,zi(u)}r.setRequestHeader=function(u,h){this.A.append(u,h)},r.getResponseHeader=function(u){return this.h&&this.h.get(u.toLowerCase())||""},r.getAllResponseHeaders=function(){if(!this.h)return"";const u=[],h=this.h.entries();for(var d=h.next();!d.done;)d=d.value,u.push(d[0]+": "+d[1]),d=h.next();return u.join(`\r
`)};function zi(u){u.onreadystatechange&&u.onreadystatechange.call(u)}Object.defineProperty(Sa.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(u){this.m=u?"include":"same-origin"}});function Ld(u){let h="";return ya(u,function(d,C){h+=C,h+=":",h+=d,h+=`\r
`}),h}function Bl(u,h,d){e:{for(C in d){var C=!1;break e}C=!0}C||(d=Ld(d),typeof u=="string"?d!=null&&Mi(d):Te(u,h,d))}function Se(u){Ze.call(this),this.headers=new Map,this.L=u||null,this.h=!1,this.g=null,this.D="",this.o=0,this.l="",this.j=this.B=this.v=this.A=!1,this.m=null,this.F="",this.H=!1}f(Se,Ze);var Ry=/^https?$/i,by=["POST","PUT"];r=Se.prototype,r.Fa=function(u){this.H=u},r.ea=function(u,h,d,C){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+u);h=h?h.toUpperCase():"GET",this.D=u,this.l="",this.o=0,this.A=!1,this.h=!0,this.g=this.L?this.L.g():Cd.g(),this.g.onreadystatechange=p(l(this.Ca,this));try{this.B=!0,this.g.open(h,String(u),!0),this.B=!1}catch(N){kd(this,N);return}if(u=d||"",d=new Map(this.headers),C)if(Object.getPrototypeOf(C)===Object.prototype)for(var S in C)d.set(S,C[S]);else if(typeof C.keys=="function"&&typeof C.get=="function")for(const N of C.keys())d.set(N,C.get(N));else throw Error("Unknown input type for opt_headers: "+String(C));C=Array.from(d.keys()).find(N=>N.toLowerCase()=="content-type"),S=o.FormData&&u instanceof o.FormData,!(Array.prototype.indexOf.call(by,h,void 0)>=0)||C||S||d.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[N,J]of d)this.g.setRequestHeader(N,J);this.F&&(this.g.responseType=this.F),"withCredentials"in this.g&&this.g.withCredentials!==this.H&&(this.g.withCredentials=this.H);try{this.m&&(clearTimeout(this.m),this.m=null),this.v=!0,this.g.send(u),this.v=!1}catch(N){kd(this,N)}};function kd(u,h){u.h=!1,u.g&&(u.j=!0,u.g.abort(),u.j=!1),u.l=h,u.o=5,xd(u),Pa(u)}function xd(u){u.A||(u.A=!0,ut(u,"complete"),ut(u,"error"))}r.abort=function(u){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.o=u||7,ut(this,"complete"),ut(this,"abort"),Pa(this))},r.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),Pa(this,!0)),Se.Z.N.call(this)},r.Ca=function(){this.u||(this.B||this.v||this.j?Vd(this):this.Xa())},r.Xa=function(){Vd(this)};function Vd(u){if(u.h&&typeof i<"u"){if(u.v&&Kn(u)==4)setTimeout(u.Ca.bind(u),0);else if(ut(u,"readystatechange"),Kn(u)==4){u.h=!1;try{const N=u.ca();e:switch(N){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var h=!0;break e;default:h=!1}var d;if(!(d=h)){var C;if(C=N===0){let J=String(u.D).match(vd)[1]||null;!J&&o.self&&o.self.location&&(J=o.self.location.protocol.slice(0,-1)),C=!Ry.test(J?J.toLowerCase():"")}d=C}if(d)ut(u,"complete"),ut(u,"success");else{u.o=6;try{var S=Kn(u)>2?u.g.statusText:""}catch{S=""}u.l=S+" ["+u.ca()+"]",xd(u)}}finally{Pa(u)}}}}function Pa(u,h){if(u.g){u.m&&(clearTimeout(u.m),u.m=null);const d=u.g;u.g=null,h||ut(u,"ready");try{d.onreadystatechange=null}catch{}}}r.isActive=function(){return!!this.g};function Kn(u){return u.g?u.g.readyState:0}r.ca=function(){try{return Kn(this)>2?this.g.status:-1}catch{return-1}},r.la=function(){try{return this.g?this.g.responseText:""}catch{return""}},r.La=function(u){if(this.g){var h=this.g.responseText;return u&&h.indexOf(u)==0&&(h=h.substring(u.length)),cy(h)}};function Md(u){try{if(!u.g)return null;if("response"in u.g)return u.g.response;switch(u.F){case"":case"text":return u.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in u.g)return u.g.mozResponseArrayBuffer}return null}catch{return null}}function Sy(u){const h={};u=(u.g&&Kn(u)>=2&&u.g.getAllResponseHeaders()||"").split(`\r
`);for(let C=0;C<u.length;C++){if(I(u[C]))continue;var d=dy(u[C]);const S=d[0];if(d=d[1],typeof d!="string")continue;d=d.trim();const N=h[S]||[];h[S]=N,N.push(d)}ny(h,function(C){return C.join(", ")})}r.ya=function(){return this.o},r.Ha=function(){return typeof this.l=="string"?this.l:String(this.l)};function $i(u,h,d){return d&&d.internalChannelParams&&d.internalChannelParams[u]||h}function Gd(u){this.za=0,this.i=[],this.j=new Vi,this.ba=this.na=this.J=this.W=this.g=this.wa=this.G=this.H=this.u=this.U=this.o=null,this.Ya=this.V=0,this.Sa=$i("failFast",!1,u),this.F=this.C=this.v=this.m=this.l=null,this.X=!0,this.xa=this.K=-1,this.Y=this.A=this.D=0,this.Qa=$i("baseRetryDelayMs",5e3,u),this.Za=$i("retryDelaySeedMs",1e4,u),this.Ta=$i("forwardChannelMaxRetries",2,u),this.va=$i("forwardChannelRequestTimeoutMs",2e4,u),this.ma=u&&u.xmlHttpFactory||void 0,this.Ua=u&&u.Rb||void 0,this.Aa=u&&u.useFetchStreams||!1,this.O=void 0,this.L=u&&u.supportsCrossDomainXhr||!1,this.M="",this.h=new Dd(u&&u.concurrentRequestLimit),this.Ba=new vy,this.S=u&&u.fastHandshake||!1,this.R=u&&u.encodeInitMessageHeaders||!1,this.S&&this.R&&(this.R=!1),this.Ra=u&&u.Pb||!1,u&&u.ua&&this.j.ua(),u&&u.forceLongPolling&&(this.X=!1),this.aa=!this.S&&this.X&&u&&u.detectBufferingProxy||!1,this.ia=void 0,u&&u.longPollingTimeout&&u.longPollingTimeout>0&&(this.ia=u.longPollingTimeout),this.ta=void 0,this.T=0,this.P=!1,this.ja=this.B=null}r=Gd.prototype,r.ka=8,r.I=1,r.connect=function(u,h,d,C){lt(0),this.W=u,this.H=h||{},d&&C!==void 0&&(this.H.OSID=d,this.H.OAID=C),this.F=this.X,this.J=Qd(this,null,this.W),Oa(this)};function hl(u){if(Ud(u),u.I==3){var h=u.V++,d=tn(u.J);if(Te(d,"SID",u.M),Te(d,"RID",h),Te(d,"TYPE","terminate"),Qi(u,d),h=new Hn(u,u.j,h),h.M=2,h.A=ba(tn(d)),d=!1,o.navigator&&o.navigator.sendBeacon)try{d=o.navigator.sendBeacon(h.A.toString(),"")}catch{}!d&&o.Image&&(new Image().src=h.A,d=!0),d||(h.g=Wd(h.j,null),h.g.ea(h.A)),h.F=Date.now(),Ra(h)}$d(u)}function Na(u){u.g&&(dl(u),u.g.cancel(),u.g=null)}function Ud(u){Na(u),u.v&&(o.clearTimeout(u.v),u.v=null),Fa(u),u.h.cancel(),u.m&&(typeof u.m=="number"&&o.clearTimeout(u.m),u.m=null)}function Oa(u){if(!yd(u.h)&&!u.m){u.m=!0;var h=u.Ea;fe||E(),oe||(fe(),oe=!0),T.add(h,u),u.D=0}}function Py(u,h){return Td(u.h)>=u.h.j-(u.m?1:0)?!1:u.m?(u.i=h.G.concat(u.i),!0):u.I==1||u.I==2||u.D>=(u.Sa?0:u.Ta)?!1:(u.m=xi(l(u.Ea,u,h),zd(u,u.D)),u.D++,!0)}r.Ea=function(u){if(this.m)if(this.m=null,this.I==1){if(!u){this.V=Math.floor(Math.random()*1e5),u=this.V++;const S=new Hn(this,this.j,u);let N=this.o;if(this.U&&(N?(N=Zf(N),td(N,this.U)):N=this.U),this.u!==null||this.R||(S.J=N,N=null),this.S)e:{for(var h=0,d=0;d<this.i.length;d++){t:{var C=this.i[d];if("__data__"in C.map&&(C=C.map.__data__,typeof C=="string")){C=C.length;break t}C=void 0}if(C===void 0)break;if(h+=C,h>4096){h=d;break e}if(h===4096||d===this.i.length-1){h=d+1;break e}}h=1e3}else h=1e3;h=qd(this,S,h),d=tn(this.J),Te(d,"RID",u),Te(d,"CVER",22),this.G&&Te(d,"X-HTTP-Session-Id",this.G),Qi(this,d),N&&(this.R?h="headers="+Mi(Ld(N))+"&"+h:this.u&&Bl(d,this.u,N)),cl(this.h,S),this.Ra&&Te(d,"TYPE","init"),this.S?(Te(d,"$req",h),Te(d,"SID","null"),S.U=!0,sl(S,d,null)):sl(S,d,h),this.I=2}}else this.I==3&&(u?Hd(this,u):this.i.length==0||yd(this.h)||Hd(this))};function Hd(u,h){var d;h?d=h.l:d=u.V++;const C=tn(u.J);Te(C,"SID",u.M),Te(C,"RID",d),Te(C,"AID",u.K),Qi(u,C),u.u&&u.o&&Bl(C,u.u,u.o),d=new Hn(u,u.j,d,u.D+1),u.u===null&&(d.J=u.o),h&&(u.i=h.G.concat(u.i)),h=qd(u,d,1e3),d.H=Math.round(u.va*.5)+Math.round(u.va*.5*Math.random()),cl(u.h,d),sl(d,C,h)}function Qi(u,h){u.H&&ya(u.H,function(d,C){Te(h,C,d)}),u.l&&ya({},function(d,C){Te(h,C,d)})}function qd(u,h,d){d=Math.min(u.i.length,d);const C=u.l?l(u.l.Ka,u.l,u):null;e:{var S=u.i;let ue=-1;for(;;){const Ve=["count="+d];ue==-1?d>0?(ue=S[0].g,Ve.push("ofs="+ue)):ue=0:Ve.push("ofs="+ue);let Ee=!0;for(let je=0;je<d;je++){var N=S[je].g;const nn=S[je].map;if(N-=ue,N<0)ue=Math.max(0,S[je].g-100),Ee=!1;else try{N="req"+N+"_"||"";try{var J=nn instanceof Map?nn:Object.entries(nn);for(const[Vr,Jn]of J){let zn=Jn;a(Jn)&&(zn=Zu(Jn)),Ve.push(N+Vr+"="+encodeURIComponent(zn))}}catch(Vr){throw Ve.push(N+"type="+encodeURIComponent("_badmap")),Vr}}catch{C&&C(nn)}}if(Ee){J=Ve.join("&");break e}}J=void 0}return u=u.i.splice(0,d),h.G=u,J}function jd(u){if(!u.g&&!u.v){u.Y=1;var h=u.Da;fe||E(),oe||(fe(),oe=!0),T.add(h,u),u.A=0}}function fl(u){return u.g||u.v||u.A>=3?!1:(u.Y++,u.v=xi(l(u.Da,u),zd(u,u.A)),u.A++,!0)}r.Da=function(){if(this.v=null,Kd(this),this.aa&&!(this.P||this.g==null||this.T<=0)){var u=4*this.T;this.j.info("BP detection timer enabled: "+u),this.B=xi(l(this.Wa,this),u)}},r.Wa=function(){this.B&&(this.B=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.P=!0,lt(10),Na(this),Kd(this))};function dl(u){u.B!=null&&(o.clearTimeout(u.B),u.B=null)}function Kd(u){u.g=new Hn(u,u.j,"rpc",u.Y),u.u===null&&(u.g.J=u.o),u.g.P=0;var h=tn(u.na);Te(h,"RID","rpc"),Te(h,"SID",u.M),Te(h,"AID",u.K),Te(h,"CI",u.F?"0":"1"),!u.F&&u.ia&&Te(h,"TO",u.ia),Te(h,"TYPE","xmlhttp"),Qi(u,h),u.u&&u.o&&Bl(h,u.u,u.o),u.O&&(u.g.H=u.O);var d=u.g;u=u.ba,d.M=1,d.A=ba(tn(h)),d.u=null,d.R=!0,_d(d,u)}r.Va=function(){this.C!=null&&(this.C=null,Na(this),fl(this),lt(19))};function Fa(u){u.C!=null&&(o.clearTimeout(u.C),u.C=null)}function Jd(u,h){var d=null;if(u.g==h){Fa(u),dl(u),u.g=null;var C=2}else if(al(u.h,h))d=h.G,wd(u.h,h),C=1;else return;if(u.I!=0){if(h.o)if(C==1){d=h.u?h.u.length:0,h=Date.now()-h.F;var S=u.D;C=Aa(),ut(C,new dd(C,d)),Oa(u)}else jd(u);else if(S=h.m,S==3||S==0&&h.X>0||!(C==1&&Py(u,h)||C==2&&fl(u)))switch(d&&d.length>0&&(h=u.h,h.i=h.i.concat(d)),S){case 1:xr(u,5);break;case 4:xr(u,10);break;case 3:xr(u,6);break;default:xr(u,2)}}}function zd(u,h){let d=u.Qa+Math.floor(Math.random()*u.Za);return u.isActive()||(d*=2),d*h}function xr(u,h){if(u.j.info("Error code "+h),h==2){var d=l(u.bb,u),C=u.Ua;const S=!C;C=new qn(C||"//www.google.com/images/cleardot.gif"),o.location&&o.location.protocol=="http"||Ui(C,"https"),ba(C),S?wy(C.toString(),d):Ay(C.toString(),d)}else lt(2);u.I=0,u.l&&u.l.pa(h),$d(u),Ud(u)}r.bb=function(u){u?(this.j.info("Successfully pinged google.com"),lt(2)):(this.j.info("Failed to ping google.com"),lt(1))};function $d(u){if(u.I=0,u.ja=[],u.l){const h=Ad(u.h);(h.length!=0||u.i.length!=0)&&(y(u.ja,h),y(u.ja,u.i),u.h.i.length=0,m(u.i),u.i.length=0),u.l.oa()}}function Qd(u,h,d){var C=d instanceof qn?tn(d):new qn(d);if(C.g!="")h&&(C.g=h+"."+C.g),Hi(C,C.u);else{var S=o.location;C=S.protocol,h=h?h+"."+S.hostname:S.hostname,S=+S.port;const N=new qn(null);C&&Ui(N,C),h&&(N.g=h),S&&Hi(N,S),d&&(N.h=d),C=N}return d=u.G,h=u.wa,d&&h&&Te(C,d,h),Te(C,"VER",u.ka),Qi(u,C),C}function Wd(u,h,d){if(h&&!u.L)throw Error("Can't create secondary domain capable XhrIo object.");return h=u.Aa&&!u.ma?new Se(new ll({ab:d})):new Se(u.ma),h.Fa(u.L),h}r.isActive=function(){return!!this.l&&this.l.isActive(this)};function Yd(){}r=Yd.prototype,r.ra=function(){},r.qa=function(){},r.pa=function(){},r.oa=function(){},r.isActive=function(){return!0},r.Ka=function(){};function La(){}La.prototype.g=function(u,h){return new wt(u,h)};function wt(u,h){Ze.call(this),this.g=new Gd(h),this.l=u,this.h=h&&h.messageUrlParams||null,u=h&&h.messageHeaders||null,h&&h.clientProtocolHeaderRequired&&(u?u["X-Client-Protocol"]="webchannel":u={"X-Client-Protocol":"webchannel"}),this.g.o=u,u=h&&h.initMessageHeaders||null,h&&h.messageContentType&&(u?u["X-WebChannel-Content-Type"]=h.messageContentType:u={"X-WebChannel-Content-Type":h.messageContentType}),h&&h.sa&&(u?u["X-WebChannel-Client-Profile"]=h.sa:u={"X-WebChannel-Client-Profile":h.sa}),this.g.U=u,(u=h&&h.Qb)&&!I(u)&&(this.g.u=u),this.A=h&&h.supportsCrossDomainXhr||!1,this.v=h&&h.sendRawJson||!1,(h=h&&h.httpSessionIdParam)&&!I(h)&&(this.g.G=h,u=this.h,u!==null&&h in u&&(u=this.h,h in u&&delete u[h])),this.j=new Rs(this)}f(wt,Ze),wt.prototype.m=function(){this.g.l=this.j,this.A&&(this.g.L=!0),this.g.connect(this.l,this.h||void 0)},wt.prototype.close=function(){hl(this.g)},wt.prototype.o=function(u){var h=this.g;if(typeof u=="string"){var d={};d.__data__=u,u=d}else this.v&&(d={},d.__data__=Zu(u),u=d);h.i.push(new gy(h.Ya++,u)),h.I==3&&Oa(h)},wt.prototype.N=function(){this.g.l=null,delete this.j,hl(this.g),delete this.g,wt.Z.N.call(this)};function Xd(u){el.call(this),u.__headers__&&(this.headers=u.__headers__,this.statusCode=u.__status__,delete u.__headers__,delete u.__status__);var h=u.__sm__;if(h){e:{for(const d in h){u=d;break e}u=void 0}(this.i=u)&&(u=this.i,h=h!==null&&u in h?h[u]:void 0),this.data=h}else this.data=u}f(Xd,el);function Zd(){tl.call(this),this.status=1}f(Zd,tl);function Rs(u){this.g=u}f(Rs,Yd),Rs.prototype.ra=function(){ut(this.g,"a")},Rs.prototype.qa=function(u){ut(this.g,new Xd(u))},Rs.prototype.pa=function(u){ut(this.g,new Zd)},Rs.prototype.oa=function(){ut(this.g,"b")},La.prototype.createWebChannel=La.prototype.g,wt.prototype.send=wt.prototype.o,wt.prototype.open=wt.prototype.m,wt.prototype.close=wt.prototype.close,Tm=function(){return new La},ym=function(){return Aa()},Dm=Fr,Xl={jb:0,mb:1,nb:2,Hb:3,Mb:4,Jb:5,Kb:6,Ib:7,Gb:8,Lb:9,PROXY:10,NOPROXY:11,Eb:12,Ab:13,Bb:14,zb:15,Cb:16,Db:17,fb:18,eb:19,gb:20},va.NO_ERROR=0,va.TIMEOUT=8,va.HTTP_ERROR=6,nc=va,pd.COMPLETE="complete",Im=pd,ld.EventType=Li,Li.OPEN="a",Li.CLOSE="b",Li.ERROR="c",Li.MESSAGE="d",Ze.prototype.listen=Ze.prototype.J,io=ld,Se.prototype.listenOnce=Se.prototype.K,Se.prototype.getLastError=Se.prototype.Ha,Se.prototype.getLastErrorCode=Se.prototype.ya,Se.prototype.getStatus=Se.prototype.ca,Se.prototype.getResponseJson=Se.prototype.La,Se.prototype.getResponseText=Se.prototype.la,Se.prototype.send=Se.prototype.ea,Se.prototype.setWithCredentials=Se.prototype.Fa,Em=Se}).apply(typeof xa<"u"?xa:typeof self<"u"?self:typeof window<"u"?window:{});/*!
* re2js
* RE2JS is the JavaScript port of RE2, a regular expression engine that provides linear time matching
*
* @version v2.8.6
* @author Oleksii Vasyliev
* @homepage https://github.com/le0pard/re2js#readme
* @repository github:le0pard/re2js
* @license MIT
*/var M=class Gr{static FOLD_CASE=1;static LITERAL=2;static CLASS_NL=4;static DOT_NL=8;static ONE_LINE=16;static NON_GREEDY=32;static PERL_X=64;static UNICODE_GROUPS=128;static WAS_DOLLAR=256;static LOOKBEHIND=512;static MATCH_NL=Gr.CLASS_NL|Gr.DOT_NL;static PERL=Gr.CLASS_NL|Gr.ONE_LINE|Gr.PERL_X|Gr.UNICODE_GROUPS;static POSIX=0;static UNANCHORED=0;static ANCHOR_START=1;static ANCHOR_BOTH=2};const bs={CASE_INSENSITIVE:1,DOTALL:2,MULTILINE:4,DISABLE_UNICODE_GROUPS:8,LONGEST_MATCH:16,LOOKBEHINDS:512},So=128,Zl=new Int32Array(So),eB=new Int32Array(So),Va=65535;for(let r=0;r<So;r++)r>=97&&r<=122?Zl[r]=r-32:Zl[r]=r,r>=65&&r<=90?eB[r]=r+32:eB[r]=r;var L=class{static CODES=new Map([["\x07",7],["\b",8],["	",9],[`
`,10],["\v",11],["\f",12],["\r",13],[" ",32],['"',34],["$",36],["&",38],["'",39],["(",40],[")",41],["*",42],["+",43],["-",45],[".",46],["0",48],["1",49],["2",50],["3",51],["4",52],["5",53],["6",54],["7",55],["8",56],["9",57],[":",58],["<",60],[">",62],["?",63],["A",65],["B",66],["C",67],["F",70],["P",80],["Q",81],["U",85],["Z",90],["[",91],["\\",92],["]",93],["^",94],["_",95],["`",96],["a",97],["b",98],["f",102],["i",105],["m",109],["n",110],["r",114],["s",115],["t",116],["v",118],["x",120],["z",122],["{",123],["|",124],["}",125]]);static toUpperCase(r){if(r<So)return Zl[r];const e=String.fromCodePoint(r).toUpperCase(),t=e.codePointAt(0)>Va?2:1;if(e.length>t)return r;const n=String.fromCodePoint(e.codePointAt(0)).toLowerCase(),s=n.codePointAt(0)>Va?2:1;return n.length>s||n.codePointAt(0)!==r?r:e.codePointAt(0)}static toLowerCase(r){if(r<So)return eB[r];const e=String.fromCodePoint(r).toLowerCase(),t=e.codePointAt(0)>Va?2:1;if(e.length>t)return r;const n=String.fromCodePoint(e.codePointAt(0)).toUpperCase(),s=n.codePointAt(0)>Va?2:1;return n.length>s||n.codePointAt(0)!==r?r:e.codePointAt(0)}},g=class{constructor(r,e=!1){this.data=r,this.isStride1=e,this.SIZE=e?2:3}getLo(r){return this.data[r*this.SIZE]}getHi(r){return this.data[r*this.SIZE+1]}getStride(r){return this.isStride1?1:this.data[r*this.SIZE+2]}get length(){return this.data.length/this.SIZE}};const wm=new Uint8Array(256);for(let r=0,e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-";r<64;r++)wm[e.charCodeAt(r)]=r;const Am=r=>{const e=[];let t=0,n=0;for(let s=0;s<r.length;s++){let i=wm[r.charCodeAt(s)];t|=(i&31)<<n,(i&32)===0?(e.push(t),t=0,n=0):n+=5}return e},_=(r,e)=>{const t=Am(r),n=e?t.length/2:t.length/3,s=new Uint32Array(n*3);let i=0,o=0;for(let a=0;a<n;a++)i+=t[o++],s[a*3]=i,i+=t[o++],s[a*3+1]=i,s[a*3+2]=e?1:t[o++];return s},uw=r=>{const e=Am(r),t=new Map;let n=0;for(let s=0;s<e.length;s+=2){n+=e[s];const i=e[s+1],o=i>>>1^-(i&1);t.set(n,n+o)}return t};var Ma=class{constructor(r){this.initializer=r,this.cache=new Map}has(r){return r in this.initializer}get(r){if(this.cache.has(r))return this.cache.get(r);const e=this.initializer[r],t=e?e():null;return this.cache.set(r,t),t}},gt=class{static _CASE_ORBIT=null;static get CASE_ORBIT(){return this._CASE_ORBIT||(this._CASE_ORBIT=uw("rCgCIgCY+rQI4QiCuuBLgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCCgCBgCBgCBgCBgCBgCBgCB+7OB-BB-BB-BB-BB-BBskQB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BC-BB-BB-BB-BB-BB-BB-BByHBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBDCBBBCBBBCBBCCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBCCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBxHBCBBBCBBBCBBB3SBmMBkNBCBBBCBBB8MBCBBB6MB6MBCBBC+EB0MB2MBCBBB6MB+MBiGBmNBiNBCBBBmKBikzCBmNBqNBkIBsNBCBBBCBBBCBBB0NBCBBB0NDCBBB0NBCBBByNByNBCBBBCBBB2NBCBBDCBBCwDFCBCBDBCBCBDBCBCBDBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBB9EBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBCCBCBDBCBBBhGBvDBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBjICCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBH2iVBCBBBlKBwiVB+jVB+jVBCBBBlMBqEBuEBCBBBCBBBCBBBCBBBCBBB+hVB4hVB8hVBjNB7MC5MB5MCzMC1MB+0yCE5MB20yCC9MBu2yCBwyyCBo0yCChNBlNBo0yCBu-UBi0yCDlNC6-UBpNDrNIu+UDzNCm0yCBzNE0yyCBzNBpEBxNBxNBtEG1NLqxyCBkxyCnFoFrBCBBBCBBDCBBEkIBkIBkICoHHsCCqCBqCBqCCgEC+DB+DBmkOBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCC+BBgCBgCBgCBgCBgCBgCBgCBgCBrCBpCBpCBpCBmjOB-BB8BB-BB-BBgEB-BB-BByBBqgOBsDB-BBtwBB-BB-BB-BBsBBgDBCB-BB-BB-BBeB-BB-BB61OB-BB-BB-DB9DB9DBQB7DBmCE9CBrDBPBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBrFB-EBOBnHB3FB-FCCBBBNBCBBCjIBjIBjIBgFBgFBgFBgFBgFBgFBgFBgFBgFBgFBgFBgFBgFBgFBgFBgFBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCB-BB-BB8kMB-BB6kMB-BB-BB-BB-BB-BB-BB-BB-BB-BBokMB-BB-BBkkMBkkMB-BB-BB-BB-BB-BB-BB-BB4jMB-BB-BB-BB-BB-BB-EB-EB-EB-EB-EB-EB-EB-EB-EB-EB-EB-EB-EB-EB-EB-EBCBBBCBoiMBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBJCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBeBCBBBCBBBCBBBCBBBCBBBCBBBCBBBdBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBCgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDL-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-C64CgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOCgmOGgmODg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FDg8FBg8FBg8FhVg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBQBQBQBQBQBQDPBPBPBPBPBPjkC7mMB5mMBnmMBjmMBCBlmMB3lMBpiMBk8kCBCBBG-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FD-7FB-7FB-7F6FoglCEsuHRwjlCyDCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCB0DBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBG1DD97OCCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBQBQBQBQBQBQBQBQBPBPBPBPBPBPBPBPBQBQBQBQBQBQDPBPBPBPBPBPDQBQBQBQBQBQBQBQBPBPBPBPBPBPBPBPBQBQBQBQBQBQBQBQBPBPBPBPBPBPBPBPBQBQBQBQBQBQDPBPBPBPBPBPEQCQCQCQCPCPCPCPBQBQBQBQBQBQBQBQBPBPBPBPBPBPBPBPB0EB0EBsFBsFBsFBsFBoGBoGBgIBgIBgHBgHB8HB8HDQBQBQBQBQBQBQBQBPBPBPBPBPBPBPBPBQBQBQBQBQBQBQBQBPBPBPBPBPBPBPBPBQBQBQBQBQBQBQBQBPBPBPBPBPBPBPBPBQBQCSFPBPBzEBzEBRCxnOFSFrFBrFBrFBrFBREQBQClkOFPBPBnGBnGFQBQCljOCODPBPB-GB-GBNHSF-HB-HB7HB7HBRqJ53OE9tQBrmQH4Bc3BSgBBgBBgBBgBBgBBgBBgBBgBBgBBgBBgBBgBBgBBgBBgBBgBBfBfBfBfBfBfBfBfBfBfBfBfBfBfBfBfECBByZ0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzB34BgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CBCBBBt-UBruHBt+UB1iVBviVBCBBBCBBBCBBB3hVB5-UB9hVB7hVCCBBCCBBI9jVB9jVBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBICBBBCBBECBBN-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOC-lOG-lOzoeCBBBCBBBCBBBCBBBCBBBCBl8kCBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBTCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBnECBBBCBBBCBBBCBBBCBBBCBBBCBBDCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBKCBBBCBBBnglCBCBBBCBBBCBBBCBBBCBBECBBBvyyCDCBBBCBBBgDCCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBn0yCB90yCB10yCBh0yCBn0yCCjxyCBzyyCBpxyCBg6BBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBB-CBl0yCBvjlCBCBBBCBBBt2yCBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBhkzCZCBB9a-5Bd-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCm6TCBB7gBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCH-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BmlBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvChDwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCFvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvC1DuCBuCBuCBuCBuCBuCBuCBuCBuCBuCBuCCuCBuCBuCBuCBuCBuCBuCBuCBuCBuCBuCBuCBuCBuCBuCCuCBuCBuCBuCBuCBuCBuCCuCBuCCtCBtCBtCBtCBtCBtCBtCBtCBtCBtCBtCCtCBtCBtCBtCBtCBtCBtCBtCBtCBtCBtCBtCBtCBtCBtCCtCBtCBtCBtCBtCBtCBtCCtCBtCk2BgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEO-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-D+CgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCL-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-B74CgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BhrVgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BhB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BD1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BtxekCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjC")),this._CASE_ORBIT}static _Print=null;static get Print(){return this._Print||(this._Print=new g(_("hB9CBjBLBCpWBDFBFGBCCCBSBCsMBClBBDxBBDCBC2BBJaBFFBSVBC-FBCvBBD6BBDkDBP6BBDwBBDOBCbBDCCBJBGfBIqCBCgFBCHBDBBDVBCGBCEEBCBDIBDBBDDBJFFBCCBDBDYBDCBCFBFBBDVBCGBCBBCBBCBBDCCBDBFBBDCBEIIBCBCIIBPBLCBCIBCCBCVBCGBCBBCEBDJBCCBCCBDQQBCBDLBIGBCCBCHBDBBDVBCGBCBBCEBDIBDBBDCBICBFBBCEBDRBLBBCFBECBCDBEBBCCCBEEBEEBBBELBFEBECBCDBDHHPUBGMBCCBCWBCPBDIBCCBCDBIBBCCBCBBDDBDJBIVBCCBCWBCJBCEBDIBCCBCDBIBBGCBCDBDJBCCBNMBCCBCyBBCCBCFBFPBDZBCCBCRBEXBCIBCDDBFBEFFBEBCCCBGBHJBDCBN5BBFcBmBBBCCCBDBCXBCCCBVBDEBCCCBFBCJBDDBhBnCBCjBBFmBBCjBBCOBCMBmBlGBCGGD4LBCDBDGBCCCBCBDoBBCDBDgBBCDBDGBCCCBCBDOBC4BBCDBDiCBDfBEZBH1CBDFBD-TBCbBE4CBIVBKXBKTBNMBCCBCBBN9CBDJBHJBHNBCKBH4CBIqBBGlCBLeBCLBFLBFEEBoBBDEBMrBBFZBHKBE9BBDgCBCcBDKBHJBHNBDtBBDLBVsCBClFBJ7BBEOBE9BBGqBBDKBJqBBG1QBDFBDlBBDFBDHBCGCBdBD0BBCOBCNBDFBCSBDCBCIBSXBJuBBSBBDaBCMBEhBBPgBBQrEBF5UBXKBWz4BBD9LBGsBBCGGD3BBIBBPXBKGBCGBCGBCGBCGBCGBCGBCGBC9DBjBZBC4CBN1GBbPBC+BBC1CBDmDBGqBBC9CBC1CBKvBBCszcBE2BBK7KBV3FBJ8GBV7BBEJBH3BBJlCBJLBHzDBMdBEtCBCKBFgBBC2BBKNBDJBDmDBZbBLFBDFBDFBKGBCGBC7BBF9DBDJBHj9KBNWBFwBBloItLBDpDBnBGBNEBGZBCEBCCCBCCBCCBoUBhBpBBHyBBCSBCDBFEBCmEBF9FBEFBDFBDFBDCBEGBCGBOBBDLBCZBCSBCBBCOBDNBjB6DBGCBFsBBE3CBCMBEwBwBBsBBjEcBEwBBQbBFjBBKdBGqBBGdBCkBBFNBrB9EBDJBHjBBFjBBFnBBJzBBMLBCOBCGBCBBCKBCOBCGBCBBEzBBN2JBKVBLHBZFBCpBBCIBmCFBDCCBqBBCBBEDDBVBCnCBJIBxBSBCBBGgBBEaBGaBnB3BBFTBDxBBCBBGHBCCBCcBDCBFJBIIBI-BBhBmBBFLBK1BBEcBDaBGZBIDBNGBxCoCB4ByBBOyBBItBBJJBHlBBEcBJBBxGeBCpBBCCBDBBRFBJIBiBtBBJpBBXZBnBbBVWBKtCBFjBBK9BBCEBOYBIJBH0BBCRBJmBBK-CBCTBMRBCuBB-BGBCCCBCBCOBCKBH6BBGJBHDBCHBDBBDVBCGBCBBCEBCJBDBBDCBDHHGGBDGBEEBMJBCDDClBBCJBCDDCDBCJBCBBJBBe7CBCEBfnCBJJBnF1BBDlBBjBkCBMJBHMBU5BBHJBHTBdaBDOBFWB6F7BBlDyCBNHBDDDBGBCBBCdBCBBDLBKJBnCHBDtBBDKBcnCBJyCBOoCBIJB3CHB5ChBBPJBHIBCsBBCNBLcBEfBDVBCNBqCGBCBBCrBBECCBCCBHBJJBHFBCBBCkBBCBBCFBIJBHrBBFJB3HYBIQBCoBBEcB2CQQBwBBO6cBnDuDBCEBMjGBtyCiDBOvhBBRVBL68DBGmSB61G5BBn2B4RBIeBCJBFwCBCJBHdBDFBLlCBLJBCGBCUBGSBxN5BBnG6CBGYBDYBtBqCBF4BBIQBhCEBMGBK1mHBqBfBiDyDB+vIDBCGBCBBCiJBQeeBBBDPPBCBJrMBloCqDBGMBEIBIJBDDBh7D8HBEzNBHWBQQBQtBBDWBKzDB9B1HBLmBBDpCBJvDBWlCB7DTBNTBN2CBKYBoE0CBCmCBCBBDDDBDDBCBCLBCCCBFBCgCBCDBDHBCGBCbBCDBCEBCEEBFBCzKBDjJBD9VBQEBCOBxiBeBHFB2GGBCQBDGBCBBCEBG9BBiBxDxDBrBBENBDJBFBBhKeBS5BBGxOxOBoBB3GqBBFhGhGBdBCVBJBBhHGBCDBCBBCOBCkGBDPBqBrCBFJBFBByYjCBtC8BBjGDBCaBCBBCDDCJBCDBCCCHFFCECBBBCBBCDDCICBCCDDBCGBCDBCDBCCCBIBCQBGCBCEBCQB1BBBvIrBBFjDBNOBDOBCOBCkBBLtFB5BcBOrBBFIBIBBPFB7E4eBEQBEMBE5GBHLBFQQBKBF3BBJJBHnBBJdBDLBFBBPIBoB3KBJNBDMBEKBE4BBCFFBOBDLBFJBIyEBCmDBmgB-2pBBhB9oEBDt0FBDwpHBQtTBjtC9QBjvBq6EBGppIBnkzVvHB",!1))),this._Print}static CATEGORIES=new Ma({C:()=>new g(_("AfBgDgBBOrWrWBHHBCBICCVuMuMnBBBzBBBE4B4BBGBcDBHQBXhGhGxBBB8BBBmDNB8BBByBBBQddBCCMEBhBGBsCiFiFJBBDBBXIICCBFBBKBBDBBFHBCDBDGGBaaBEEHDBDBBXIIDGDBCCGDBDBBECBCGBFCCBFBSJBEKKEXXIDDGBBLIEBCCBNBFBBNGBIEEJBBDBBXIIDGGBKKBDDBEEBFBEDBDGGBTTBIBDHHBBBEFFBBBDCCDCBDCBECBNDBGCBEFFBCCBEBCNBWEBOEEYRRBKKEFFBFBDEEDBBFBBLGBXEEYLLGBBKEEFGBDEBEFFBLLELBOEE0BEEHDBRBBbEETCBZKKCBBICBCDBHCCJFBLBBELB7BDBekBBDCCGZZCYYBGGCIILBBFfBpClBlBBCBoBlBlBQOOBjBBnGCCBDBCBB6LFFBIICFFBqBqBFBBiBFFBIICFFBQQ6BFFBkCkCBhBhBBBBbFB3CBBHBB+UCB6CGBXIBZIBVLBOEEDLB-CBBLFBLFBPMMBEB6CGBsBEBnCJBgBNNBCBNDBCCBrBBBGKBtBDBbFBMCB-BBBiCeeBMMBEBLFBPBBvBBBNTBuCnFnFBGB9BCBQCB-BEBsBBBMHBsBEB3QBBHBBnBBBHBBJGCgBBB2BQQPBBHUUBEEKMMBDBbEByBPBDBBcOOBBBjBNBiBOBtEDB7UVBMUB14BBB-LEBuBCCBDBCBB5BGBDNBZIBI4BI-DhBBb6C6CBKB3GZBxC3C3CBoDoDBDBsB-C-C3CIBxBuzcuzcBBB4BIB9KTB5FHB+GTB9BCBLFB5BHBnCHBNFB1DKBfCBvCMMBCBiB4B4BBHBPBBLBBoDXBdJBHBBHBBHIBIII9BDB-DBBLFBl9KLBYDByBjoIBvLBBrDlBBILBGEBbGGCGDrUfBrBFB0BUUFDBGoEoEBCB-FCBHBBHBBHBBECBIIIBLBDBBNbbUDDQBBPhBB8DEBEDBuBCB5COOBBBCuBBvBhEBeCByBOBdDBlBIBfEBsBEBfmBmBBCBPpBB-EBBLFBlBDBlBDBpBHB1BKBNQQIDDMQQIDDBBB1BLB4JIBXJBJXBHrBrBKkCBHBBCtBtBDCBCBBYpCpCBGBKvBBUDDBDBiBCBcEBclBB5BDBVBBzBDDBDBJEEeBBEDBLGBKGBhCfBoBDBNIB3BCBeBBcEBbGBFLBIvCBqC2BB0BMB0BGBvBHBLFBnBCBeHBDvGBgBrBrBEBBDPBHHBKgBBvBHBrBVBblBBdTBYIBvCDBlBIB-BGGBLBaGBLFB2BTTBGBoBIBhDVVBJBTwBwBB8BBICCFQQMFB8BEBLFBFJJBDDBXXIDDGLLBDDBEEBCCBEBCEBIBBICBGKBLCCBCCnBLLCBBCFFLDDBGBDcB9CGGBcBpCHBLlFB3BBBnBhBBmCKBLFBOSB7BFBLFBVbBcBBQDBY4FB9BjDB0CLBJBBCBBJDDfDDBNNBHBLlCBJBBvBBBMaBpCHB0CMBqCGBL1CBJ3CBjBNBLFBKuBuBPJBeCBhBBBXPPBnCBIDDtBCBCDDKHBLFBHDDmBDDHGBLFBtBDBL1HBaGBSqBqBBBBe0CBCOBzBMB8clDBwDGGBJBlGryCBkDMBxhBPBXJB88DEBoS41GB7Bl2BB6RGBgBLLBCByCLLBEBfBBHJBnCJBLIIWEBUvNB7BlGB8CEBaBBarBBsCDB6BGBS-BBGKBIIB3mHoBBhBgDB0D8vIBFIIDkJkJBNBCcBEBBCNBFHBtMjoCBsDEBOCBKGBLBBF-6DB+HCB1NFBYOBSOBvBBBYIB1D7BB3HJBoBBBrCHBxDUBnC5DBVLBVLB4CIBamEB2CoCoCDBBCBBDBBFNNCIIiCFFBJJIddFGGCCBI1K1KBlJlJB-V-VBNBGQQBuiBBgBFBH0GBISSBIIDGGBDB-BgBBCvDBuBCBPBBLDBD-JBgBQB7BEBCvOBrB1GBsBDBC-FBgBXXBGBD-GBIFFDQQmGBBRoBBtCDBLDBDwYBlCrCB+BhGBFccDCCBCCLFFCCCBEBCDBCECEDDCBBCICDCCBFFIKFCLLSEBEGGSzBBDtIBtBDBlDLBQBBQQQmBJBvF3BBeMBtBDBKGBDNBH5EB6eCBSCBOCB7GFBNDBCOBNDB5BHBLFBpBHBfBBNDBDNBKmBB5KHBPBBOCBMCB6BCCBCBRBBNDBLGB0EoDoDBjgBBh3pBfB-oEBBv0FBBypHOBvThtCB-QhvBBs6EEBrpIlkzVBxHvw-FB",!1)),Cc:()=>new g(_("AfgDgB",!0)),Cf:()=>new g(_("tFzqBzqBBEBXhGhGyBhMhMBxCxCs5D9-B9-BBDBbEByBEBCJBw03B6H6HBBBimEQQj7IPBhjiBDBwmFHBn0rYffB+CB",!1)),Cn:()=>new g(_("4bBBHDBICCVuMuMnBBBzBBBE4B4BBGBcDBHKBvI9B9BBmDmDBMB8BBByBBBQddBCCMEBjBEBuHJJBDDBXXICCBBBFBBKBBDBBFHBCDBDGGBaaBEEHDBDBBXIIDGDBCCGDBDBBECBCGBFCCBFBSJBEKKEXXIDDGBBLIEBCCBNBFBBNGBIEEJBBDBBXIIDGGBKKBDDBEEBFBEDBDGGBTTBIBDHHBBBEFFBBBDCCDCBDCBECBNDBGCBEFFBCCBEBCNBWEBOEEYRRBKKEFFBFBDEEDBBFBBLGBXEEYLLGBBKEEFGBDEBEFFBLLELBOEE0BEEHDBRBBbEETCBZKKCBBICBCDBHCCJFBLBBELB7BDBekBBDCCGZZCYYBGGCIILBBFfBpClBlBBCBoBlBlBQOOBjBBnGCCBDBCBB6LFFBIICFFBqBqBFBBiBFFBIICFFBQQ6BFFBkCkCBhBhBBBBbFB3CBBHBB+UCB6CGBXIBZIBVLBOEEDLB-CBBLFBLFBbFB6CGBsBEBnCJBgBNNBCBNDBCCBrBBBGKBtBDBbFBMCB-BBBiCeeBMMBEBLFBPBBvBBBNTBuCnFnFBGB9BCBQCB-BEBsBBBMHBsBEB3QBBHBBnBBBHBBJGCgBBB2BQQPBBHUUBEEKmDmDNBBcOOBBBjBNBiBOBtEDB7UVBMUB14BBB-LEBuBCCBDBCBB5BGBDNBZIBI4BI-DhBBb6C6CBKB3GZBxC3C3CBoDoDBDBsB-C-C3CIBxBuzcuzcBBB4BIB9KTB5FHB+GTB9BCBLFB5BHBnCHBNFB1DKBfCBvCMMBCBiB4B4BBHBPBBLBBoDXBdJBHBBHBBHIBIII9BDB-DBBLFBl9KLBYDByBDBvzIBBrDlBBILBGEBbGGCGDrUfBrBFB0BUUFDBGoEoEBCC-FCBHBBHBBHBBECBIIIBIBGBBNbbUDDQBBPhBB8DEBEDBuBCB5COOBBBCuBBvBhEBeCByBOBdDBlBIBfEBsBEBfmBmBBCBPpBB-EBBLFBlBDBlBDBpBHB1BKBNQQIDDMQQIDDBBB1BLB4JIBXJBJXBHrBrBKkCBHBBCtBtBDCBCBBYpCpCBGBKvBBUDDBDBiBCBcEBclBB5BDBVBBzBDDBDBJEEeBBEDBLGBKGBhCfBoBDBNIB3BCBeBBcEBbGBFLBIvCBqC2BB0BMB0BGBvBHBLFBnBCBeHBDvGBgBrBrBEBBDPBHHBKgBBvBHBrBVBblBBdTBYIBvCDBlBIBlCJBCBBaGBLFB2BTTBGBoBIBhDVVBJBTwBwBB8BBICCFQQMFB8BEBLFBFJJBDDBXXIDDGLLBDDBEEBCCBEBCEBIBBICBGKBLCCBCCnBLLCBBCFFLDDBGBDcB9CGGBcBpCHBLlFB3BBBnBhBBmCKBLFBOSB7BFBLFBVbBcBBQDBY4FB9BjDB0CLBJBBCBBJDDfDDBNNBHBLlCBJBBvBBBMaBpCHB0CMBqCGBL1CBJ3CBjBNBLFBKuBuBPJBeCBhBBBXPPBnCBIDDtBCBCDDKHBLFBHDDmBDDHGBLFBtBDBL1HBaGBSqBqBBBBe0CBCOBzBMB8clDBwDGGBJBlGryCBkDMB3iBJB88DEBoS41GB7Bl2BB6RGBgBLLBCByCLLBEBfBBHJBnCJBLIIWEBUvNB7BlGB8CEBaBBarBBsCDB6BGBS-BBGKBIIB3mHoBBhBgDB0D8vIBFIIDkJkJBNBCcBEBBCNBFHBtMjoCBsDEBOCBKGBLBBJ76DB+HCB1NFBYOBSOBvBBBYIB1D7BB3HJBoBBBjGUBnC5DBVLBVLB4CIBamEB2CoCoCDBBCBBDBBFNNCIIiCFFBJJIddFGGCCBI1K1KBlJlJB-V-VBNBGQQBuiBBgBFBH0GBISSBIIDGGBDB-BgBBCvDBuBCBPBBLDBD-JBgBQB7BEBCvOBrB1GBsBDBC-FBgBXXBGBD-GBIFFDQQmGBBRoBBtCDBLDBDwYBlCrCB+BhGBFccDCCBCCLFFCCCBEBCDBCECEDDCBBCICDCCBFFIKFCLLSEBEGGSzBBDtIBtBDBlDLBQBBQQQmBJBvF3BBeMBtBDBKGBDNBH5EB6eCBSCBOCB7GFBNDBCOBNDB5BHBLFBpBHBfBBNDBDNBKmBB5KHBPBBOCBMCB6BCCBCBRBBNDBLGB0EoDoDBjgBBh3pBfB-oEBBv0FBBypHOBvThtCB-QhvBBs6EEBrpIm8yVBCdBhD-DBxHvw-BB---BBB---BBB",!1)),Co:()=>new g(_("gg4B-nGh4hc9--BD9--B",!0)),Cs:()=>new g(_("gg2B--B",!0)),L:()=>new g(_("hCZBHZBwBLLFGGBVBCeBCpOBFLBPEBICCiEEBCBBDDBCHHCCBCCCBSBCyCBCqEBJlFBClBBDHHBnBBoCaBFDBuBqBBkBBBCiDBCQQBIIBLLBBBDRRCdBe4CBMZZBfBKBBFGGBUBFKKEYYBXBIKBGXBCGBRpBB7B1BBETTIJBQPBFHBDBBDVBCGBCEEBCBERROBBCCBPBBLJJBEBFBBDVBCGBCBBCBBCBBgBDBCUUBBBRIBCCBCVBCGBCBBCEBETTQBBYMMBGBDBBDVBCGBCBBCEBEffBCCBBBQSSCFBECBCDBEBBCCCBEEBEEBBBELBX1B1BBGBCCBCWBCPBEbbBBBCBBDBBfFFBGBCCBCWBCJBCEBEffBBBCBBQBBSIBCCBCoBBDRRGCBJCBZFBGRBEXBCIBCDDBFB7BvBBCBBNGB7BBBCCCBDBCXBCCCBIBCBBKDDBDBCWWBCBhBgCgCBGBCjBBcEB0DqBBVRRBEBFDBEEEBIIBBBFMBNSSBkBBCGGDqBBCsKBCDBDGBCCCBCBDoBBCDBDgBBCDBDGBCCCBCBDOBC4BBCDBDiCBmBPBR1CBDFBErTBDQBCZBGqCBHHBIRBOSBPRBPMBCCBQzBBkBFFkC4CBIEBDhBBCGGBkCBLeByBdBDEBMrBBFZB3BWBK0BBzC+C+CBtBBSHB3BdBOBBLrBBbjBBqBCBLjBBDKBGqBBDCBqBDBCFBCBBEGGB+FBhC1IBDFBDlBBDFBDHBCGCBdBD0BBCGBCEEBBBCGBEDBDFBFMBGCBCGB1DOORMBmDFFDJBCEEBDBHGCBCBCKBDDBGEBF1B1BB8zC8zCBjHBHDBEBBNlBBCGGD3BBIRRBVBKGBCGBCGBCGBCGBCGBCGBCGBxC2O2OBrBrBBDBGBBF1CBHCBC5CBCDBGqBBC9CBSfBxBPBhQ-tGBhCs0VBkCtBBDsIBEPBLBBVuBBReBDlCByBIBDmDBDxCBVQBCCBCDBCWBezBBPxBB-BFBECCBMMBaBLWBacBIuBBdRRBDBCJBLEBCoBBYCBCHBVWBEEEBwBBCEEBDDBDBDCCZCBDKBICBNFBDFBDFBKGBCGBCqBBCNBHyDBej9KBNWBFwBBloItLBDpDBnBGBNEBGCCBIBCMBCEBCCCBCCBCCBqDBiBqLBT-BBD1BBpBLB1DEBCmEBlBZBHZBM4CBEFBDFBDFBDCBkBLBCZBCSBCBBCOBDNBjB6DBmMcBEwBBwBfBOTBCHBHlBBLdBDjBBFHBxB9EBTjBBFjBBFnBBJzBBNKBCOBCGBCBBCKBCOBCGBCBBEzBBN2JBKVBLHBZFBCpBBCIBmCFBDCCBqBBCBBEDDBVBLWBKeBiCSBCBBLVBLZBHZBnB3BBHBBhCQQBCBCCBCcBrBcBEcBkBHBCbBc1BBLVBLSBORBvDoCB4ByBBOyBBOjBBnBbBKWB7HpBBHBBRFB5BcBLJJBUBrBRBvBUBcWBN0BB6BBBDOOBrBBhBYBbjBBeDDJiBBENNBuBBPDBWCCkBRBCYBUBBgCGBCCCBCBCOBCJBIuBBnBHBDBBDVBCGBCBBCEBETTNEBfJBCDDClBBCaaCtBtBBzBBTDBVCBfvBBVBBC5F5FBtBBqBDBlBvBBV8B8BBpBBOoCoCBZBmBGB6FrBB1D-BBgBHBDDDBGBCBBCXBQCC-CHBDmBBRCCdLLBmBBIWWMtBBUTTBnCBoGgBBgBIBCkBBSyByBBcBxDGBCBBClBBWaaBEBCBBCfBPYYBqBBlISBQCCBLBChBB9DwCwCB4cBnHjGBtyCgDBQvhBBSFBa68DBGmSB61GdBj3B4RBIeBSuCBSdBTvBBRDBgBUBGSBxNsBB0G-BBhBYBDYBtBqCBGjCjCBLBhCBBCPPBNNB0mHBqBfBiDyDB+vIDBCGBCBBCiJBQeeBBBDPPBCBJrMBloCqDBGMBEIBIJBn7F0CBCmCBCBBDDDBDDBCBCLBCCCBFBCgCBCDBDHBCGBCbBCDBCEBCEEBFBCzKBDYBCYBCeBCYBCeBCYBCeBCYBCeBCYBCHB15BeBHFBmI9BBzEsBBLGBRiKiKBcBTrBBlPbBlHdBDwGwGBdBCCBCBBCGBDEBKBBhHGBCDBCBBCOBCkGB8BjCBI1lB1lBBCBCaBCBBCDDCJBCDBCCCHFFCECBBBCBBCDDCICBCCDDBCGBCDBCDBCCCBIBCQBGCBCEBCQBlqE-2pBBhB9oEBDt0FBDwpHBQtTBjtC9QBjvBq6EBGppIB",!1)),LC:()=>new g(_("hCZBHZB7BLLBVBCeBCiGBCDBFvGBDZBhGDBDBBECBCHHCCBCCCBSBCyCBCqEBJlFBClBBKoBB44ClBBCGGDqBBDCBhV1CBDFBjkCKBGqBBDCBhCrBBgCMBChBBmD1IBDFBDlBBDFBDHBCGCBdBD0BBCGBCEEBBBCGBEDBDFBFMBGCBCGBmIFFDJBCEEBDBHGCBCBCFBFDDBCBGEBF1B1BB8zC8zCB6DBDmDBHDBEBBNlBBCGGzoetBBTbBnEtCBCWBEDBCsCBZBBE2Z2ZBpBBGIBIvCBh6TGBNEBqgBZBHZBmlBvCBhDjBBFjBB1DKBCOBCGBCBBCKBCOBCGBCBBk2ByBBOyBB+CVBLVB74C-BBhrV-BBhBYBDYBtpZ0CBCmCBCBBDDDBDDBCBCLBCCCBFBCgCBCDBDHBCGBCbBCDBCEBCEEBFBCzKBDYBCYBCeBCYBCeBCYBCeBCYBCeBCYBCHB15BJBCTBHFB2uCjCB",!1)),Ll:()=>new g(_("hDZB7BqBqBBWBCHBC2BCBQCBuBCDECBBBDCCDEEBFFDEEBBBDDDCCCDCCBCCDEECDDBDDBBBHGDCOCBSCBDDCEEC4BCBFBDDDBCCFICBjCBDZBiGCCEEEBBBTccBhBBCBBECBCWCBDBCGDB0B0BBuBBCgBCK0BCDMCBgDCxBoBBo6CqBBDCB5XFBjkCIBC2D2DBqBBgCMBChBBnD0ECBHBCgDCBHBJFBLHBJHBJFBLHBJHBJNBDHBJHBJHBJEBCBBHEEBBBCBBJDBDBBJHBLCBCBBzIEEBEEcKFDBBJDBF2B2Bs1CvBBCEEBGCFCCBCCBEBGiDCBIICFFNlBBCGG0oesBCUaCoEMCBBBC+BCBGBCCCDICFCCDCCBBBCSCGGGCMCFCCDOCbEE2ZqBBGIBIvCBh6TGBNEBqhBZBumBnBBpEjBB8EKBCOBCGBCBBk4ByBB+DVB75CfBhsVfB8BYBnqZZBbGBCRBbZBbDBCCCBFBCKBbZBbZBbZBbZBbZBbZBbZBbZBbbBdYBCFBbYBCFBbYBCFBbYBCFBbYBCFBC15B15BBIBCTBHFB4vChBB",!1)),Lm:()=>new g(_("wVRBFLBPEBICCmEGG-OnHnHlFBBuIBBFgBgBKEEhFoFoF1mBgEgE2R72B72BsDkTkTxOFBvF+BBOjBjBBjBByVOORMBg-CBByHgGgG2OsBsBBDBGiDiDB+C+CBBB34bjnBjnBBEBvIzDzDdBB6DIBxCYYpDDBEBB2OXXqEtDtDWBBoDDBKngVngVuBBBh-BFBCpBBCIB0sBhBhB2K04D04DnrTDB9PCBpBBBnRMBhCBBCPPB9-P9-PBCBCGBCBByhM9BBqGGBud0Q0QsSAB",!1)),Lo:()=>new g(_("qFQQhIFFBCBxGBB7ZaBFDBuBfBCJBkBBBCiDBCZZBLLBBBDRRCdBe4CBMZZBfBWVBrBYBIKBGXBCGBRoBB8B1BBETTIJBROBFHBDBBDVBCGBCEEBCBERROBBCCBPBBLJJBEBFBBDVBCGBCBBCBBCBBgBDBCUUBBBRIBCCBCVBCGBCBBCEBETTQBBYMMBGBDBBDVBCGBCBBCEBEffBCCBBBQSSCFBECBCDBEBBCCCBEEBEEBBBELBX1B1BBGBCCBCWBCPBEbbBBBCBBDBBfFFBGBCCBCWBCJBCEBEffBBBCBBQBBSIBCCBCoBBDRRGCBJCBZFBGRBEXBCIBCDDBFB7BvBBCBBNFB8BBBCCCBDBCXBCCCBIBCBBKDDBDBYDBhBgCgCBGBCjBBcEB0DqBBVRRBEBFDBEEEBIIBBBFMBNyDyDBnKBCDBDGBCCCBCBDoBBCDBDgBBCDBDGBCCCBCBDOBC4BBCDBDiCBmBPByDrTBDQBCZBGqCBHHBIRBOSBPRBPMBCCBQzBBpBkCkCBhBBC0BBIEBDhBBCGGBkCBLeByBdBDEBMrBBFZB3BWBK0BBxFuBBSHB3BdBOBBLrBBbjBBqBCBLdByDDBCFBCBBE7hB7hBBCB4-C3BBZWBKGBCGBCGBCGBCGBCGBCGBCGBoR2B2BF1CBJCCB4CBFGGBpBBC9CBSfBxBPBhQ-tGBhC0wUBC2jBBkCnBBJrIBFPBLBBjCyByBBkCBqFoDoDEGBCCBCDBCWBezBBPxBB-BFBECCBMMBaBLWBacBIuBBuBEBDIBLEBCoBBYCBCHBVPBCFBEEEBwBBCEEBDDBDBDCCZBBEKBIPPBEBDFBDFBKGBCGByEiBBej9KBNWBFwBBloItLBDpDBkCCCBIBCMBCEBCCCBCCBCCBqDBiBqLBT-BBD1BBpBLB1DEBCmEBqDJBCsBBDeBEFBDFBDFBDCBkBLBCZBCSBCBBCOBDNBjB6DBmMcBEwBBwBfBOTBCHBHlBBLdBDjBBFHBhEtCBjDnBBJzBB9CzBBN2JBKVBLHB5EFBDCCBqBBCBBEDDBVBLWBKeBiCSBCBBLVBLZBHZBnB3BBHBBhCQQBCBCCBCcBrBcBEcBkBHBCbBc1BBLVBLSBORBvDoCB4FjBBnBDBCxJxJBoBBHBBRCBCBB5BcBLJJBUBrBRBvBUBcWBN0BB6BBBDOOBrBBhBYBbjBBeDDJiBBENNBuBBPDBWCCkBRBCYBUBBgCGBCCCBCBCOBCJBIuBBnBHBDBBDVBCGBCBBCEBETTNEBfJBCDDClBBCaaCtBtBBzBBTDBVCBfvBBVBBC5F5FBtBBqBDBlBvBBV8B8BBpBBOoCoCBZBmBGB6FrBB0GHBDDDBGBCBBCXBQCC-CHBDmBBRCCdLLBmBBIWWMtBBUTTBnCBoGgBBgBIBCkBBSyByBBcBxDGBCBBClBBWaaBEBCBBCfBPYYBnBBCBBlISBQCCBLBChBB9DwCwCB4cBnHjGBtyCgDBQvhBBSFBa68DBGmSB61GdBj3B4RBIeBSuCBSdBTvBB0BUBGSB0NnBB2MqCBGwFwFB0mHBqBfBiDyDBuwIiJBQeeBBBDPPBCBJrMBloCqDBGMBEIBIJBxzI2P2PBrBBiBiKiKBcBTrBBlPaBmHdBDwGwGBdBCCBCBBCGBDEBKiHiHBFBCDBCBBCOBCkGB8pBDBCaBCBBCDDCJBCDBCCCHFFCECBBBCBBCDDCICBCCDDBCGBCDBCDBCCCBIBCQBGCBCEBCQBlqE-2pBBhB9oEBDt0FBDwpHBQtTBjtC9QBjvBq6EBGppIB",!1)),Lt:()=>new g(_("lOGDnB2sH2sHBGBJHBJHBNQQwBAB",!1)),Lu:()=>new g(_("hCZBmDWBCGBiB2BCDOCDuBCBECEBBCCCBCCBBBDDBCBBCCBEBBCBBCECBCCDCCBCCBBBCCCBEEIJDCMCDQCDDDCCBC4BCIBBCBBDCCBCBCGCiJCCEJJHCCBBBCCCBCCBPBCIBkBDDBBBEWCGDDCBBDyBBxBgBCK2BCBMCD+CCDlBBq6ClBBCGGzW1CB0kCHHBpBBDCBhK0ECKgDCKHBJFBLHBJHBJFBMGCJHBpCDBNDBNDBNEBMDBnIFFECBDCBDEEBDBHGCBCBDDBLBBG+B+B9zCvBBxBCCBBBDGCBCBCDDJCBCgDCJCCFuqeuqeCqBCUaCoEMCE8BCLECBICFCCDCCEUCBDBCEBCOCBCBCCCBQCZs5Vs5VBYBmmBnBBpEjBB9EKBCOBCGBCBBr3ByBB+EVB75CfBhsVfBhCYBoqZZBbZBbZBbCCBGDBDDBCBCHBbZBbBBCDBDHBCGBcBBCDBCEBCEEBFBcZBbZBbZBbZBbZBbZBfYBiBYBiBYBiBYBiBYBiB2pE2pEBgBB",!1)),M:()=>new g(_("gYvDB0IGBoIsBBCCCBCCBCCpCKBxBUBRmDmDBFBDFBDBBCDBkBffBZB8CKB7BIBKZZBCBCIBCCBCEBsBCB8BIBrBXBCgBB3BCBCRBCGBLBBeCB5BCCBFBDBBDCBKLLBbbDCB5BCCBDBFBBDCBEffBEEMCB5BCCBGBCCBCCBVBBXFBCCB5BCCBFBDBBDCBICBLBBf8B8BBDBECBCDBKpBpBBDB4BCCBFBCCBCDBIBBMBBeCB5BCCBFBCCBCDBIBBMBBQNNBCB4BBBCGBCCBCDBKLLBeeBBBnCFFBEBCCCBGBTBB+BDDBFBNHBjDDDBHBMGBqCBBcECFBByBTBCBBGKBCjBBKlDlDBSBYDBFCBCCBDGBEDBOLBCLLBCBgWCBzdDBdCBeBBfBBhCfBKuBuBBBBC2D2DBjBjB3DLBFLB8GEB6BJBCcBDxBxBBsBBDLBVEBwBQBnBIBNCBfMB5BNBxBTB5ECBCUBFHHDCBnG-BBxWgBB--CCBuEhDhDBeBrRFBqDBB1udDBCJBhBBBxCBBxIEEFYYBDBF0C0CBzBzBBQBbRBOnBnBBGBaMBtBDBwBNBlBkCkCBMBNJJBuBuBBBBzBCCBBBDBBGBBCqBqBBDBGBBtHHBCBBx5TiXiXBOBRPBuejHjH2EEBn0BCBCBBGDBpBCBFmFmFB+R+RBCBiCEB+JBBuCFBnCKByBDB7DCB2BOBqBDDBLLBCBuBKBI+B+BBBBlBNBRBBtBNNBBBxBNBJDBCBB9CLBHDD+ELBWDB4BBBCGBDBBDCBKLLBDDBFBEEBkCIBCDDCDBCEBCPPBzCzCBQBYyCyCBSBsHGBDIBcBBzCQBrDMBmDOBhIOB2HFBCBBDDBCCCBuEuEBFBDGBEddBIBpBGBCDBJKKBJBvBPBnGHBoGHBCHBzCVBCNB7DFBECCBCCBFBCjCjCBDBCBBCEB8KDBKBBCxBxBBFBEEBYmnFmnFHOBpmLRBhuCEB8BGB5gBCCB1BBIDByCMMBslTslTBizEizEBsBBDWB-QEBEFBJHBDGBfDB1ECB89B2BBFxBBJPPXEBCOBxqBGBCQBDGBCBBCEBlDhFhFBFB4L+B+BBCB9PDB-HBB0HDDIBBG7O7OBFBuDGB29lYvHB",!1)),Mc:()=>new g(_("joC4B4BDCBJDBCBBzBBB7BCBHBBDBBLsBsB7BCBjC7B7BBBBJCCB2B2BB7B7BCHHBDDBLLnDBBCBBECBCCBLqBqBBBB+BDB+BBB7BCCBDBDBBCBBKBBdPPB7B7BBBBGCBCCBLrBrBBsCsCBBBHHBTBBrKBBgCsFsFBFFHDDBaaBLLBBBDGBWBBDFBDLLBBB5zBffiEIIBGBCBB7KDBDCBFBBCFBhHBB7BCCKCCBJJBEByExBxBGCCBDBCBB+BffFBBD9B9BDCBCEEBxBxBBGBJBBsFWW35EBB0-dBBD5C5CBzBzBBOBvEBBwBxBxBBFFBDDBBBvDBBDBBZuBuBCuDuDDBBGuHuHBCCBCCBCC0gZCCgEuBuBBBBFBB0DZZB8B8BxBCBKBBO+C+CBBBEBBCrFrFBBBgBBB7BBBCDBDBBDCBKLLB1C1CBBBIDDCDBCBBCmDmDBBBJBBErDrDBBBHCCBCBDuHuHBBBHDBDyDyDBBBJBBCuDuDCBBHoDoDCBBFmImIBBBK4H4HBEBCBBFDDCvEvEBBBJDBF1C1CeBB-BqGqGECCoGPPrDIID2G2GBDBFBBC-K-KBNNxBBBJBBCpvQpvQBBBlxD2BBpDBB0rYBBHFB",!1)),Me:()=>new g(_("okBBB1xF-wB-wBBCBCCBsshBCB",!1)),Mn:()=>new g(_("gYvDB0IEBqIsBBCCCBCCBCCpCKBxBUBRmDmDBFBDFBDBBCDBkBffBZB8CKB7BIBKZZBCBCIBCCBCEBsBCB8BIBrBXBCfB4BCCFHBFEEBFBLBBe7B7BFDBJVVBbbDBB6BFFBFFBDDBBBEffBEEMBB6BFFBDBCBBFVVBXXBEBC7B7BDCCBCBJIIBMMBff+BNNzBEE4BCCBBBGCBCDBIBBMBBe7B7BDHHGBBVBBdBB6BBBFDBJVVBeepCIIBBBC7C7CDGBNHBjDDDBHBMGBqCBBcEC4BNBCEBCBBGKBCjBBKnDnDBCBCFBCBBDBBaBBFCBRDBODDBHHQgWgWBBBzdCBeBBfBBfBBhCBBCGBJDDBJBKuBuBBBBC2D2DBjBjB3DCBFBBKHHBBB8GBBD7B7BCGBCCCDHBHJBDxBxBBMBCeBDLBVDBxBCCBDBCGGpBIBNBBhBDBDBBCCB5BCCBEECCB7BHBDBB5ECBCMBCGBFHHEBBnG-BBxWMBFEEBKB--CCBuEhDhDBeBrRDBsDBB1udFFBIBhBBBxCBBxIEEFaaBGG4EBBbRBOnBnBBGBaKBvBCBxBDDBCBDBBoBkCkCBEBDBBDBBNJJwB0B0BCCBDBBGBBCrBrBBJJvHDDFx5Tx5TiXPBRPBuejHjH2EEBn0BCBCBBGDBpBCBFmFmFB+R+RBCBiCEB+JBBuCFBnCKByBDB8D3B3BBNBqBDDBLLBBByBDBDBBI+B+BBBBlBEBCHB-BNNB1B1BBHBLDBDgDgDBBBDCCBHHD+E+EEHBWBB6BBBEmBmBBFBEEBnCFBOECPBB2CHBDCBCYY1CFBCFFBCCBvHvHBCBHBBCBBcBB2CHBDCCBrDrDCDDBEBCmDmDCDDBCBCEBkIIBCBBhIBBCFFxEDBDBBFhBhBBIBpBFBDDBJKKBEBDCBvBMBCBBnGCCBBBCqGqGBFBCFBCzCzCBUBDGBCBBCBB7DFBECCBCCBFBCpCpCBEEC8K8KBMMB1B1BBDBGCCYmnFmnFHOBpmLLBECBhuCEB8BGB5gBgCgCBCByC5lT5lTBizEizEBsBBDWBhRCBSHBDGBfDB1ECB89B2BBFxBBJPPXEBCOBxqBGBCQBDGBCBBCEBlDhFhFBFB4L+B+BBCB9PDB-HBB0HDDIBBG7O7OBFBuDGB29lYvHB",!1)),N:()=>new g(_("wBJB5DBBGDDBBBitBJBnEJBnGJB9MJB3DJBFFBtDJB3DJB3DJBDFBvDMB0DJBJGBoDJBpDGBISBuDJBhDJB3DJBnCTBtIJBnCJBwWTBybCBwHJBHJBXJBtJJBhEKBmFJBHJB3FJB3CJBnEJBHJB3gBEEBEBHJBnGyBBDEB3W7BBvCVB3TdBqrBqYqYaIBPCB4KDBrEJBfHBCOBhBJBoBOBh7cJB9FJBhKFB7EJBnBJBnGJBXJB3CJB3MJB34UJBuPsBBN4BBSBB2KaBlBDBeJJnEEBrGJBvdHBaGBoBIBsCEBXFBhFBBDPBDtBBhCIB1BBBfCBsCEBpDHBZHBqBGBrKFBxBJBHJB3IeB-EJBrBDBxDGBnEdBhEJB9BJBxEJBITB8HJB3KJB3DJB3LJBnDJBHTBtCLBlNSB+CJB3UJB3CcBkHJBnCJB3BJBnLJBnDUBshBuDBimPJBnpCJB3CJBnEJBCGBvQJBnIWB+KCB6nXJBnuBTBNTBtDYB2iBxBBhqCJBnNJB3PJB4HJBtWIBhEJB4Y6BBCCBCDBtCsBBCOBjeMBk3CJB",!1)),Nd:()=>new g(_("wBJnxBJnEJnGJ9MJ3DJ3DJ3DJ3DJ3DJ3DJ3DJ3DJ3DJhDJ3DJnCJ3IJnCJn6BJnBJtJJhEJnFJHJ3FJ3CJnEJHJnuiBJnVJnBJnGJXJ3CJ3MJ34UJnsBJnkCJHJ9YJhEJ9BJxEJ3IJ3KJ3DJ3LJnDJHTtCJnNJnDJ3UJ3CJ3HJnCJ3BJnLJ3uQJnpCJ3CJnEJ3QJ37XJ12CxBhqCJnNJ3PJ4HJ2aJ30EJ",!0)),Nl:()=>new g(_("u3FCBwzCiBBDDB-zDaaBHBPCBs1dJBxyW0BBtOJJnEEBrhIuDBm8SCB",!1)),No:()=>new g(_("yFBBGDDBBB2pCFB5LFB5DCBmEGB6GGBSIByNJB2hBTB0jBJBhP20B20BEFBHJBnGPBqB3W3WB6BBvCVB3TdBqrB1kB1kBBCBrEJBfHBCOBhBJBoBOBxrdFBymWsBBiCDBSBB2KaBlBDB1pBHBaGBoBIBsCEBXFBhFBBDPBDtBBhCIB1BBBfCBsCEBpDHBZHBqBGBrKFBhLeB-EJBrBDBxDGBnETB8LTBmqBBBvNIBobSB0aUBn8SGB-YWBqhZTBNTBtDYBvqFIBid6BBCCBCDBtCsBBCOBjeMB",!1)),P:()=>new g(_("hBCBCFBCDBLBBEBBbCBCccCkBkBGEELBBEEE-VJJzOFBqBBB0BCCDDDtBBBVBBCBBOCCBBBrCDBnDsBsBBMBqHCB3BOBgBmImIBLLtE5D5D6DnMnMNwLwL7CLLBpFpFBNBCmBmBBCBoCrCrCBDBFBBwDFBsFlTlTBHB4EuTuTtBBBvCCBoCBB+ECBCCBmBKB6JBB5GBBhEGBCFBhFBBLGBdCB9DDB8BEB-BBBhCHBM9Z9ZBWBJTBCMBCLBfBBPBB6TDBeBB+hBNBwCBBgBJB0MVBgCDBhBBB8XDBCBBxDwEwEBtBBCfBDLBkNCBFJBDLBRNNjD7C7CjgdBBuICBkDLL0DFB9LDB3CBBpBCBCyByBBwBwBiDMBRBB9DDB-DBBRBB6HzqUzqUBxGxGBIBXiBBCNBCFFCBB2ECBCFBCDBLBBEBBbCBCccCCCBFB7MCB9UxBxB-MoXoXoGgBgBxIIBnBxDxDBFBjCGB6CDByO-J-JjBlElEBDBtBDB+FGBuDBBCDB-DDBxBBBwCDBFOOCCB5CFBsDrJrJBCCBzDzDBDBLBBCpDpD7HWBqDCBdMBtCjEjEBBB9HpIpIBBB8E9C9CBGB0CCBCEB+CJB4GgDgDBDBrBBBmUBBrCMBwFxjBxjBBDB97CBB8zOBBmEiCiCBDBJpRpRBBBoJDBoK9lT9lTovHEB07C-a-aBAB",!1)),Pc:()=>new g(_("-Cg-Hg-HBUU-u3BBBZCBwHAB",!1)),Pd:()=>new g(_("tB9qB9qB0BiyDiyDmgBqgCqgCBEBiwDDDgBBBFdd-NUUwDxszBxszBBmBmBLqFqFhzD-J-J",!1)),Pe:()=>new g(_("pB0B0BgB+1D+1DC-6B-6BqtC4B4BQ7T7TCff-hBMCxChBhBCGC1MUChCCCiBmhBmhBCECtBGCtNICEGCDBB-ozB6G6GeOCESSCCCrF0B0BgBGD",!1)),Pf:()=>new g(_("7F+6H+6HEddpuDCCFDDQEE",!1)),Pi:()=>new g(_("rFt7Ht7HDBBDaapuDCCFDDQEE",!1)),Po:()=>new g(_("hBCBCCBDECBLLBEEBcclCGGPBBI-V-VJzOzOBEBqB3B3BDDDtBBBVBBCBBOCCBBBrCDBnDsBsBBMBqHCB3BOBgBmImIBLLtE5D5D6DnMnMNwLwL7CLLBpFpFBNBCxDxDrCEBFBBwDFBsFlTlTBHBmY9D9DBBBoCBB+ECBCCBmBFBCDB6JBB5GBBhEGBCFBhFBBLGBdCB9DDB8BEB-BBBhCHBMjajaBJJBGBJIBDDBDCBEKBCCCBIB7kDDBCBBxDwEwEBFFBBBDDDBHBCBBCDDBLLBDBCJBDDBCCCBLBDCBtNCB6B+F+FjgdBBuICBkDLL0DFB9LDB3CBBpBCBCyByBBwBwBiDMBRBB9DDB-DBBRBB6HlxUlxUBFBDXXVBBDDBECBCDBICBHCCB2E2EBBBCCBDECBLLBEEBcclBDDB7M7MBBB9UxBxB-MoXoXoGgBgBxIIBnBxDxDBFBjCGB6CDB0ZlElEBDBtBDB+FGBuDBBCDB-DDBxBBBwCDBFOOCCB5CFBsDrJrJBCCBzDzDBDBLBBCpDpD7HWBqDCBdMBtCjEjEBBB9HpIpIBBB8E9C9CBGB0CCBCEB+CJB4GgDgDBDBrBBBmUBBrCMBwFxjBxjBBDB97CBB8zOBBmEiCiCBDBJpRpRBBBoJDBoK9lT9lTovHEB07C-a-aBAB",!1)),Ps:()=>new g(_("oBzBzBgB-1D-1DC-6B-6B-rCEEnB4B4BQ7T7TCff-hBMCxChBhBCGC1MUChCCCiBmhBmhBCECaTTCECtNICEGCDipzBipzB4GeeCMCESSCCCrFzBzBgBEEDAB",!1)),S:()=>new g(_("kBHHRCBgBCCcCCkBEBCBBDCCBCBDEEfgBgBrODBNNBGGBCCCBPB2DPPBxDxDsErIrIBBB3DCBDDDBvGvGLUUB4H4HIBBpEqLqLBHHB2H2H-DjEjEBGBlEwGwGqBmGmGiGCBQCCBBBDFBVECmEHBCFBCBBGDBmGBBxXJB0WuLuLlL+E+EBgBBiLJBKIBhiBCCBBBMCBOCBOCBOBBmCOOoBCBOCBUhBB-BBBCDBCBBLCCBBBGFBCECFMMBFFBDBGDBC7B7BBFFB2LBFcBD+HBXKByCtCBXnTBtBwBBDeBLyMBX+BBFfBD1LBDpEBmHFBmLBBvBZBC4CBN1GBbPBFOOBNNWBBHBB8CBB0HBBFJBhBlBBKRRBdBMdBJQQBeBLmBBQ-JBhuG-BBx0V2BB6RWBKBBoDBB+EDBLDB+RCBiHPPB+9T+9TpEgBBuLPBhCBB3BHBtBDBjDCCBBBD7E7EHRRBBBgBCCcCCiEGBCGBOBB6JIB6BQBDCBCMBEwBwBBrBB7zBBBwSmWmWBiKiKBGBnjC2kC2kCBbBr6SDBG3qU3qUk7DvHBLCBEzNBHWBQQBgDzDB9B1HBLmBBD7BBGCBXBBIdBF8BBWhCBE7F7FB1CBrbaagBaagBaagBaagBaa9B-PB4BDBzBHBCNBCBBp2BwNwNttCEE+DiOiOBvIvIBqBBFjDBNOBDOBCOBCkBBYgFB5BcBOrBBFIBIBBPFB7E4eBEQBEMBE5GBHLBFQQBKBF3BBJJBHnBBJdBDLBFBBPIBoB3KBJNBDMBEKBE4BBCFFBOBDLBFJBIyEBC7CBLAB",!1)),Sc:()=>new g(_("kB+D+DBCBqnB8D8DzPBBzPBBI2H2HoImSmS8sClmClmCBgBB37hBkuVkuVtD7E7E8GBBEBB3-HDB-4wBxtCxtC",!1)),Sk:()=>new g(_("+CCCoCHHFEEqQDBNNBGGBCCCBPB2DPPBjoBjoB15FCCBBBMCBOCBOCBOBB9kEBBkzdWBKBBoDBBxePPBniUniUBPB8bCCjF4g9B4g9BBDB",!1)),Sm:()=>new g(_("rBRRBBB+BCCuBFFmBgBgB-XwQwQBBB8xGOOoBCBOCBsEoBoBBDBHlClCBDBGBBFGDIgBgBBDDCgBgBBqIBhBBB7CffBXBpBFB2OKK3BHBwDxKxKBDBDeBLPBhIiEBX+BBFfBDhIBxBUBDFB9+zB5Z5ZCCBlFRRBBB+BCCkEHHBCBitDBBhrwBx+Bx+BagBgBagBgBagBgBagBgBat5Ft5FB-uC-uCBHB",!1)),So:()=>new g(_("mFDDFCCyerIrIBgEgEBvGvGLUUB4H4HkQ2L2LjEFBClElEwGqBqBoMCBQCCBBBDFBVECmEHBCFBCBBGDBmGBBxXJB0WzWzW+EhBBiLJBKIBksBBBCDBCBBLCCBHHBEBCECFMMBPPCBBC7B7BBKKBDBDDBCBBCBBCGBCeBDBBCCCBdBtIHBFTBDGBDwCBCdBanBBHnCBXKByCtCBX2FBCIBC1BBJuDBC3HBtBrBBhC-HBhQvBBWBBHmBBDpEBmHFBmLBBvBZBC4CBN1GBbPBFOOBNNWBBHBBxKBBFJBhBlBBKRRBdBMdBJQQBeBLmBBQ-JBhuG-BBx0V2BBibDBLBBC+R+RBBBqqUPBuLPBhCBB3BHBuBCBlPEEFBBOBB6JIB6BQBDCBCMBEwBwBBrBB7zBBBwSpgBpgBBGBnjC2kC2kCBGBFQBr6SDBG3qU3qUk7DvHBLCBEzNBHWBQPBhDzDB9B1HBLmBBD7BBGCBXBBIdBF8BBWhCBE7F7FB1CBqlB-PB4BDBzBHBCNBCBBp2B96C96CiEyWyWBqBBFjDBNOBDOBCOBCkBBYgFB5BcBOrBBFIBIBBPFB7E6HBG4WBEQBEMBE5GBHLBFQQBKBF3BBJJBHnBBJdBDLBFBB-B3KBJNBDMBEKBE4BBCFFBOBDLBFJBIyEBC7CBLAB",!1)),Z:()=>new g(_("gBgEgEgvFgsCgsCBJBeBBGwBwBh9DAB",!1)),Zl:()=>new g(_("ohIA",!0)),Zp:()=>new g(_("phIA",!0)),Zs:()=>new g(_("gBgEgEgvFgsCgsCBJBlBwBwBh9DAB",!1)),ASCII_Hex_Digit:()=>new g(_("wBJIFbF",!0)),Alphabetic:()=>new g(_("hCZBHZBwBLLFGGBVBCeBCpOBFLBPEBICC3CeeBQBCBBDDBCHHCCBCCCBSBCyCBCqEBJlFBClBBDHHBnBBoBNBCCCBCCBCCJaBFDBeKBG3BBCGBPlDBCHBFHBFCBLCBDRRBuBBOkDBZgBBKBBFGGBWBDSBUYBIKBGXBCGBIJJBoBBLLBEGBHrCBCPBCCBFOBOSBCHBDBBDVBCGBCEEBCBEHBDBBDBBCJJFBBCEBNBBLFFBBBCFBFBBDVBCGBCBBCBBCBBFEBFBBDBBFIIBCBCSSBEBMCBCIBCCBCVBCGBCBBCEBEIBCCBCBBEQQBCBWDBFCBCHBDBBDVBCGBCBBCEBEHBDBBDBBKBBFBBCEBORRBCCBEBECBCDBEBBCCCBEEBEEBBBELBFEBECBCCBEHHpBMBCCBCWBCPBEHBCCBCCBJBBCCBCBBDDBdDBCHBCCBCWBCJBCEBEHBCCBCCBJBBGCBCDBOCBNMBCCBCoBBDHBCCBCCBCGGBCBIEBXFBCCBCRBEXBCIBCDDBFBJFBCCCBGBTBBO5BBGGBH0B0BBECBDBCXBCCCBRBCCBDEBCHHPDBhBgCgCBGBCjBBFSBFPBCjBBkC2BBCDDBDBR-BBLDBDlBBCGGDqBBCsKBCDBDGBCCCBCBDoBBCDBDgBBCDBDGBCCCBCBDOBC4BBCDBDiCBmBPBR1CBDFBErTBDQBCZBGqCBEKBITBMUBNTBNMBCCBCBBNzBBDSBPFFkC4CBIqBBGlCBLeBCLBFIBYdBDEBMrBBFZB3BbBF+BBDTBzBYYBMMBBByBzBBCOBCHB0BpBBDDBLrBBCKBP2BBXCBLjBBDKBGqBBDCBqBDBCFBCBBEGGB+FBUhBBM1IBDFBDlBBDFBDHBCGCBdBD0BBCGBCEEBBBCGBEDBDFBFMBGCBCGB1DOORMBmDFFDJBCEEBDBHGCBCBCKBDDBGEBFSSBnBBuZzBB34BkHBHDBEBBNlBBCGGD3BBIRRBVBKGBCGBCGBCGBCGBCGBCGBCGBCfBwB2O2OBBBaIBIEBDEBF1CBHCBC5CBCDBGqBBC9CBSfBxBPBhQ-tGBhCs0VBkCtBBDsIBEPBLBBVuBBGHBEwDBoBIBDmDBDxCBVUBCgBBZzBBNjCBCtBtBBEBECCBBBLgBBGiBBOcBEyBBCLBQRRBOBLEBC2BBKNBTWBEkCBCCCZCBDPBDDBMFBDFBDFBKGBCGBCqBBCNBH6DBWj9KBNWBFwBBloItLBDpDBnBGBNEBGLBCMBCEBCCCBCCBCCBqDBiBqLBT-BBD1BBpBLB1DEBCmEBlBZBHZBM4CBEFBDFBDFBDCBkBLBCZBCSBCBBCOBDNBjB6DBmC0BBsIcBEwBBwBfBOdBGqBBGdBDjBBFHBCEBrB9EBTjBBFjBBFnBBJzBBNKBCOBCGBCBBCKBCOBCGBCBBEzBBN2JBKVBLHBZFBCpBBCIBmCFBDCCBqBBCBBEDDBVBLWBKeBiCSBCBBLVBLZBHZBnB3BBHBBhCDBCBBGHBCCBCcBrBcBEcBkBHBCbBc1BBLVBLSBORBvDoCB4ByBBOyBBOnBBjBbBEGGBVB7HpBBCBBEBBRFBzBCBEcBLJJBUBrBRBvBUBcWBKlCBsBEBL4BBKOOBXBYyBBSDBJiBBEKKB+BBCDBKBBLCCkBRBChBBDHHBCB-BGBCCCBCBCOBCJBI4BBYDBCHBDBBDVBCGBCBBCEBEHBDBBDBBEHHGGBdJBCDDClBBCJBCDDCDBCBBECCtBhCBCCBCDBVCBfhCBDBBC5F5FB0BBDGBaFBjB+BBCEE8B1BBDoCoCBZBDNBWGB6F4BBoD-BBgBHBDDDBGBCBBCdBCBBDBBDDB+CHBDtBBDFBCCCBccBxBBDJBSnCBGTTBnCBoDHB5CgBBgBIBCsBBCGBCyByBBcBDVBCNBqCGBCBBCrBBECCBCCBBBCDDBZZBEBCBBCkBBCBBCDBCYYBqBBlIWBKQBCoBBECBwDwCwCB4cBnDuDBSjGBtyCgDBQvhBBSFBa68DBGmSB61GuBBy2B4RBIeBSuCBSdBTvBBRDBgBUBGSBxNsBB0G-BBhBYBDYBtBqCBF4BBIQBhCBBCNNBFBK1mHBqBfBiDyDB+vIDBCGBCBBCiJBQeeBBBDPPBCBJrMBloCqDBGMBEIBIJBFi7Fi7FBzCBCmCBCBBDDDBDDBCBCLBCCCBFBCgCBCDBDHBCGBCbBCDBCEBCEEBFBCzKBDYBCYBCeBCYBCeBCYBCeBCYBCeBCYBCHB15BeBHFB2GGBCQBDGBCBBCEBG9BBiBxDxDBrBBLGBRiKiKBcBTrBBlPbBlHdBDwGwGBdBCVBJBBhHGBCDBCBBCOBCkGB8BjCBEEE1lBDBCaBCBBCDDCJBCDBCCCHFFCECBBBCBBCDDCICBCCDDBCGBCDBCDBCCCBIBCQBGCBCEBCQB1TZBHZBHZB3zD-2pBBhB9oEBDt0FBDwpHBQtTBjtC9QBjvBq6EBGppIB",!1)),Dash:()=>new g(_("tB9qB9qB0BiyDiyDmgBqgCqgCBEB+BoBoBQnMnMlgDDDgBBBFdd-NUUwDxszBxszBBmBmBLqFqFhzD-J-J",!1)),Emoji:()=>new g(_("jBHHGJBwDFFu8HNN5GXX7CFBQBBwLBBNnFnFaKBFCBoGoHoHBLLK7B7BBCBCEBKGDBDDFDDCBBDIEBJJBBBGCCGLBMBBDCCBCCTDDBTTBEBCCCBEEBGGDBBFBBMBBGBBDGGBECBVVBGGBEBCDBDFFDDDBEBCDDCCCHEEHLLBQQDFFCFFBBBCMMBxBxBBBBKeP1LBBwOCBUBB0BFF7mBNN6SCCrrvDrGrGhFBBNBBPDDBIBsCZBCBBYVVDIBWBBvFhBBDvDBDBBCCBDyCBDCBCmIBC+BBMFBCXBIBBDHBNDDBCBDFFBOOBDDJBBKGGBBBNCBJCBDCCFHHEHHB0CBxBlCBGHBDDBEJBECCBEEDJBkHLBF8I8IBtBBCJBC4FBxDMBEKBE4BBCFFBOBDLBFJB",!1)),Emoji_Component:()=>new g(_("jBHHGJB0+H2G2Gsp3B3+8B3+8BBYB8PEBxtBDBtzhY-CB",!1)),Emoji_Modifier:()=>new g(_("7-8DE",!0)),Emoji_Modifier_Base:()=>new g(_("9wJ8G8GRDB4jzD9B9BBBBDDDBBB2DBBDKBWSBEFFBBBCCBICCZqGqGBFFWFFBvFvFBBBEEB0CRRBBBKMMgSDDJHBHKKBIBDCB5B+B+BBCCBCCSCBCMBmHCBrBIB",!1)),Emoji_Presentation:()=>new g(_("64IBBuGDBEDDqQBBWBBzBLBsBUUOJJBSSBGGBJJGWWIBBCFFDIIFBBdkBkBCFFBBBC+B+BBBBZPP8aBB0BFFvlxDrGrG-FDDBIBsCZBCZZVDDBDBCCBWBBvFgBBNIBClCBCVBNqBBFEBNQBEEEBlCBCCCB5FBD+BBODBCXBTbbBOO3C0CBxBlCBHEEBBBDDBEDBMBBIIBkHLBF8I8IBtBBCJBC4FBxDMBEKBE4BBCFFBOBDLBFJB",!1)),Extended_Pictographic:()=>new g(_("pFFFu8HNN5GXX7CFBQBBwLBBNnFnFaKBFCBoGoHoHBLLK7B7BBCBCEBKGDBDDFDDCBBDIEBJJBBBGCCGLBMBBDCCBCCTDDBTTBEBCCCBEEBGGDBBFBBMBBGBBDGGBECBVVBGGBEBCDBDFFDDDBEBCDDCCCHEEHLLBQQDFFCFFBBBCMMBxBxBBBBKeP1LBBwOCBUBB0BFF7mBNN6SCCrrvDoBoBBCBlDLBQBBQPPBmBmBBIBxDBBNBBPDDBIBU3BBcOBLVVDIBCDBKWBH7FBDvDBDBBCCBDyCBDCBCDBG9HBC+BBMFBCXBIBBDHBNDDBCBDFFBOOBDDJBBKGGBBBNCBJCBDCCFHHEHHB0CBxBlCBGHBDQBECCBEBDMB7GlBBNDB5BHBLFBpBHBfBBNDBDNBKmBBNuBBCJBC4FB5CHBPxEBhI9fB",!1)),Hex_Digit:()=>new g(_("wBJIFbFq1-BJIFbF",!0)),Lowercase:()=>new g(_("hDZBwBLLFlBlBBWBCHBC2BCBQCBuBCDECBBBDCCDEEBFFDEEBBBDDDCCCDCCBCCDEECDDBDDBBBHGDCOCBSCBDDCEEC4BCBFBDDDBCCFICBjCBDiBBIBBfEBhDsBsBCEEDDBTccBhBBCBBECBCWCBDBCGDB0B0BBuBBCgBCK0BCDMCBgDCxBoBBo6CqBBCDB5XFBjkCIBC2D2DB+FBiC0ECBHBCgDCBHBJFBLHBJHBJFBLHBJHBJNBDHBJHBJHBJEBCBBHEEBBBCBBJDBDBBJHBLCBCBB6DOORMBuDEEBEEcKFDBBJDBFiBiBBOBFsasaBYBn6BvBBCEEBGCFCCBCCBGBEiDCBIICFFNlBBCGG0oesBCUaCBBBmEMCBBBC8BCBIBCCCDICFCCDCCBBBCSCGGGCMCFCCDOCWDBCCCBBB2ZqBBCNBHvCBh6TGBNEBqhBZBumBnBBpEjBB8EKBCOBCGBCBBkODDBBBCpBBCIBmoByBB+DVB75CfBhsVfB8BYBnqZZBbGBCRBbZBbDBCCCBFBCKBbZBbZBbZBbZBbZBbZBbZBbZBbbBdYBCFBbYBCFBbYBCFBbYBCFBbYBCFBC15B15BBIBCTBHFBmI9BB1lChBB",!1)),Math:()=>new g(_("rBRRBBBgBeeCuBuBFmBmBgB5W5WBBBDbbBDDBBBwQCBuwGccBBBMEEOPPBCBWEBMEBiCMBFEEBFFBDBTFFDJBCDDBEBHEEBDDBCCBBBCFBENBClClCBWBCFBCBBFBBFfBCHHBPPBqIBJDBVBB7CffBZBCZZMGB+NBBNJBFFBFBBDBBEEBPCCDFBMHBGBB6BCCeDBKCBxK-BBhI-PBxBUBDFB9+zB4Z4ZBEBCjFjFRCBeCCeCCkEHHBCBitDBBhrwBwoBwoBBzCBCmCBCBBDDDBDDBCBCLBCCCBFBCgCBCDBDHBCGBCbBCDBCEBCEEBFBCzKBDjJBDxBBhwFDBCaBCBBCDDCJBCDBCCCHFFCECBBBCBBCDDCICBCCDDBCGBCDBCDBCCCBIBCQBGCBCEBCQB1BBB-uCIB",!1)),Quotation_Mark:()=>new g(_("iBFFkEQQ96HHBaBBowDqOqOBCBOCBixzBDB+FFF7CBB",!1)),Terminal_Punctuation:()=>new g(_("hBLLCMMBEE-ZJJiQ6B6BpCPPCCB1FsBsBBJBCsHsHB3B3BBEBCHBgBmImIB1nB1nBBtFtFFFB4JBB2YHBmY9D9DBBBoCBB+ECBEoBoBBCBDBB7JBBjLDBjFBBLBBCCBeCB8FEB-BBBldYYBKKBBBwlDCBzJOOFLLCBBEBBtNBB8ndBBuICBkHEB-LBB3CBBgD4E4EBBB0ECBgERRB6H6HnxUDDB6B6BBBBCDBqFLLCMMBEEiCDD7hBxBxBnkBoGoG3JBB5EFBlCFB6CDB5dEBtBDB+FGBxDDBgECBiEBBHRRB5C5CBDBtDrJrJB2D2DBBBNBBnLDBEOBqDBB6HCBmQCC8HBB4CBBFBB-MCBuBmUmUBrCrCBspBspBBDB6vRBBmEiCiCBBBLqRqRBoJoJBnwTnwTovHDB",!1)),Uppercase:()=>new g(_("hCZBmDWBCGBiB2BCDOCDuBCBECEBBCCCBCCBBBDDBCBBCCBEBBCBBCECBCCDCCBCCBBBCCCBEEIJDCMCDQCDDDCCBC4BCIBBCBBDCCBCBCGCiJCCEJJHCCBBBCCCBCCBPBCIBkBDDBBBEWCGDDCBBDyBBxBgBCK2BCBMCD+CCDlBBq6ClBBCGGzW1CB0kCHHBpBBDCBhK0ECKgDCKHBJFBLHBJHBJFBMGCJHBpCDBNDBNDBNEBMDBnIFFECBDCBDEEBDBHGCBCBDDBLBBGbbBOBUzZzZBYBx5BvBBxBCCBBBDGCBCBCDDJCBCgDCJCCFuqeuqeCqBCUaCoEMCE8BCLECBICFCCDCCEUCBDBCEBCOCBCBCCCBQCZs5Vs5VBYBmmBnBBpEjBB9EKBCOBCGBCBBr3ByBB+EVB75CfBhsVfBhCYBoqZZBbZBbZBbCCBGDBDDBCBCHBbZBbBBCDBDHBCGBcBBCDBCEBCEEBFBcZBbZBbZBbZBbZBbZBfYBiBYBiBYBiBYBiBYBiB2pE2pEBgBBvgCZBHZBHZB",!1)),White_Space:()=>new g(_("JEBTlDlDbgvFgvFgsCKBeBBGwBwBh9DAB",!1))});static get Upper(){return this.CATEGORIES.get("Lu")}static SCRIPTS=new Ma({Adlam:()=>new g(_("go6DrCFJFB",!0)),Ahom:()=>new g(_("g4lCaDOFW",!0)),Anatolian_Hieroglyphs:()=>new g(_("ggxCmS",!0)),Arabic:()=>new g(_("gwBEBCFBCNBCCBCfBCJBMZBCrDBChBBxCvBBxHhBBGqCBCcBxy8BtPBDvEBhBPBxDEBCmEBk7DeBkCFBJIBiBFBh43BDBCaBCBBCDDCJBCDBCCCHFFCECBBBCBBCDDCICBCCDDBCGBCDBCDBCCCBIBCQBGCBCEBCQB1BBB",!1)),Armenian:()=>new g(_("xpBlBDxBDCks9BE",!0)),Avestan:()=>new g(_("g4iC1BEG",!0)),Balinese:()=>new g(_("g4GsCCxB",!0)),Bamum:()=>new g(_("g1pB3CpowB4R",!0)),Bassa_Vah:()=>new g(_("w26CdDF",!0)),Batak:()=>new g(_("g+GzBJD",!0)),Bengali:()=>new g(_("gsCDBCHBDBBDVBCGBCEEBCBDIBDBBDDBJFFBCCBDBDYB",!1)),Beria_Erfe:()=>new g(_("g17CYDY",!0)),Bhaiksuki:()=>new g(_("ggnCICsBCNLc",!0)),Bopomofo:()=>new g(_("qXB6wLqBxDf",!0)),Brahmi:()=>new g(_("ggkCtCFjBKA",!0)),Braille:()=>new g(_("ggK-H",!0)),Buginese:()=>new g(_("gwGbDB",!0)),Buhid:()=>new g(_("g6FT",!0)),Canadian_Aboriginal:()=>new g(_("ggF-TxRlC7tgCP",!0)),Carian:()=>new g(_("g1gCwB",!0)),Caucasian_Albanian:()=>new g(_("wphCzBMA",!0)),Chakma:()=>new g(_("gokC0BCR",!0)),Cham:()=>new g(_("gwqB2BKNDJDD",!0)),Cherokee:()=>new g(_("g9E1CDFz7lBvC",!0)),Chorasmian:()=>new g(_("w9jCb",!0)),Common:()=>new g(_("AgCBbFBbuBBCOBCEBYgBgBiOmBBGEBDTB1DKKHCC+THHPEEhB9E9ElQiEiEB6mB6mB2MDBjJwvBwvBBBBoCBBsGBBCumBumBOIIBCBCFBCCBDmYmYBKBD2CBCKBEKBCOBShBB-BlBBCCBDFBCaBCQBqBCBF5UBXKBW-cBhIzTBDpEBhQ9CBzMUBCCCBXBQHBFDB8CBBE7C7CB0E0EBOBhBlBBKxBxBB+BBgBwCBwB5C5CBmFBhuG-BBhoWhBBnDCBmFJB1HhFhFsMPPBzuUzuUBxGxGBIBXiBBCSBCDB0ECCBeBbFBbKBLuBuBBhChCBFBCGBLEBjICBFsBBEIBxCMB0BsBBlHaBltuBDB96D8HBEzNBHWBQQBgDzDB9B1HBLmBBD9BBEQBJBBIdBF8BB2GTBNTBN2CBKYBoE0CBCmCBCBBDDDBDDBCBCLBCCCBFBCgCBCDBDHBCGBCbBCDBCEBCEEBFBCzKBDjJBDxBByjFjCBtC8BBjWrBBFjDBNOBDOBCOBCkBBLtFB5BZBCBBOrBBFIBIBBPFB7E4eBEQBEMBE5GBHLBFQQBKBF3BBJJBHnBBJdBDLBFBBPIBoB3KBJNBDMBEKBE4BBCFFBOBDLBFJBIyEBCmDBnghYffB+CB",!1)),Coptic:()=>new g(_("ifNxkKzDGG",!0)),Cuneiform:()=>new g(_("ggoC5cnDuDCEMjG",!0)),Cypriot:()=>new g(_("ggiCFBDCCBqBBCBBEDD",!1)),Cypro_Minoan:()=>new g(_("w8rCiD",!0)),Cyrillic:()=>new g(_("ggBkEBDoFBx6FKBhFtCtCojEfBhie-CBv8VBBhw4B9BBiBAB",!1)),Deseret:()=>new g(_("gghCvC",!0)),Devanagari:()=>new g(_("goCwCFODZh7nBfhwcJ",!0)),Dives_Akuru:()=>new g(_("gomCGBDDDBGBCBBCdBCBBDLBKJB",!1)),Dogra:()=>new g(_("ggmC7B",!0)),Duployan:()=>new g(_("ggvDqDGMEIIJDD",!0)),Egyptian_Hieroglyphs:()=>new g(_("ggsC1iBL68D",!0)),Elbasan:()=>new g(_("gohCnB",!0)),Elymaic:()=>new g(_("g-jCW",!0)),Ethiopic:()=>new g(_("gwEoCBCDBDGBCCCBCBDoBBCDBDgBBCDBDGBCCCBCBDOBC4BBCDBDiCBDfBEZBnvGWBKGBCGBCGBCGBCGBCGBCGBCGBjpfFBDFBDFBKGBCGBylvCGBCDBCBBCOB",!1)),Garay:()=>new g(_("gqjClBEcJB",!0)),Georgian:()=>new g(_("glElBBCGGDqBBCDBx8CqBBDCBhiElBBCGG",!1)),Glagolitic:()=>new g(_("ggL-Ch9sDGCQDGCBCE",!0)),Gothic:()=>new g(_("w5gCa",!0)),Grantha:()=>new g(_("g4kCDBCHBDBBDVBCGBCBBCEBDIBDBBDCBDHHGGBDGBEEB",!1)),Greek:()=>new g(_("wbDBCCBDDBCFFCCCBBBCCCBSBC+BBPPBnpGEBzBEBFEB1ChKhKBUBDFBDlBBDFBDHBCGCBdBD0BBCOBCNBDFBCSBDCBCIBoJ-xiB-xiB7uVuCBSgj0Bgj0BBkCB",!1)),Gujarati:()=>new g(_("h0CCBCIBCCBCVBCGBCBBCEBDJBCCBCCBDQQBCBDLBIGB",!1)),Gunjala_Gondi:()=>new g(_("grnCFCBCkBCBCFIJ",!0)),Gurmukhi:()=>new g(_("hwCCBCFBFBBDVBCGBCBBCBBCBBDCCBDBFBBDCBEIIBCBCIIBPB",!1)),Gurung_Khema:()=>new g(_("go4C5B",!0)),Han:()=>new g(_("g0LZBC4CBN1GBwBCCaIBPDBle-tGBhC-vUBhoWtLBDpDBpodBBNGBqgkB-2pBBhB9oEBDt0FBDwpHBQtTBjtC9QBjvBq6EBGppIB",!1)),Hangul:()=>new g(_("goE-HvxHBiI9CyDeiCei3dckUj9KNWFwBl9JeEFDFDFDC",!0)),Hanifi_Rohingya:()=>new g(_("gojCnBJJ",!0)),Hanunoo:()=>new g(_("g5FU",!0)),Hatran:()=>new g(_("gniCSCBGE",!0)),Hebrew:()=>new g(_("xsB2BBJaBFFBpp9BZBCEBCCCBCCBCCBIB",!1)),Hiragana:()=>new g(_("hiM1CBHCBi7-C+IBTeeBBBulQAB",!1)),Imperial_Aramaic:()=>new g(_("giiCVCI",!0)),Inherited:()=>new g(_("gYvDB2IBBlOKBbhXhXBCB8qEtBBDLBlPCBCMBCGBFHHEBBnG-BBtQBBjGgBB65DDBsDBBmrzBPBRNBwejHjH7iEl+uBl+uBBsBBDWBhRCBSHBDGBfDBz6rYvHB",!1)),Inscriptional_Pahlavi:()=>new g(_("g7iCSGH",!0)),Inscriptional_Parthian:()=>new g(_("g6iCVDH",!0)),Javanese:()=>new g(_("gsqBtCDJFB",!0)),Kaithi:()=>new g(_("gkkCiCLA",!0)),Kannada:()=>new g(_("gkDMCCCWCJCEDICCCDIBGCCDDJCC",!0)),Katakana:()=>new g(_("hlM5CBDCBxHPBxGuBBC3CBvgzBJBCsBBzisBDBCGBCBBCgJgJBBBzBPPBCB",!1)),Kawi:()=>new g(_("g4nCQCoBEc",!0)),Kayah_Li:()=>new g(_("goqBtBCA",!0)),Kharoshthi:()=>new g(_("gwiCDCBGHCCCcDCFJII",!0)),Khitan_Small_Script:()=>new g(_("k-7C84G84GB0OBqBAB",!1)),Khmer:()=>new g(_("g8F9CDJHJnPf",!0)),Khojki:()=>new g(_("gwkCRCuB",!0)),Khudawadi:()=>new g(_("w1kC6BGJ",!0)),Kirat_Rai:()=>new g(_("gq7C5B",!0)),Lao:()=>new g(_("h0DBBCCCBDBCXBCCCBVBDEBCCCBFBCJBDDB",!1)),Latin:()=>new g(_("hCZBHZBwBQQGWBCeBCgOBoBEB8wGlBBHwBBGDBGMBClCBiC-HByLOORMBuEBBHccSoBB42CfBj1elDBExCBVOBxZqBBCIBCDB38TGB7gBZBHZBmhCFBCpBBCIBm61BeBHFB",!1)),Lepcha:()=>new g(_("ggH3BEOEC",!0)),Limbu:()=>new g(_("goGeBCLBFLBFEEBKB",!1)),Linear_A:()=>new g(_("gwhC2JKVLH",!0)),Linear_B:()=>new g(_("gggCLCZCSCBCODNjB6D",!0)),Lisu:()=>new g(_("wmpBvBx1eA",!0)),Lycian:()=>new g(_("g0gCc",!0)),Lydian:()=>new g(_("gpiCZGA",!0)),Mahajani:()=>new g(_("wqkCmB",!0)),Makasar:()=>new g(_("g3nCY",!0)),Malayalam:()=>new g(_("goDMCCCyBCCCFFPDZ",!0)),Mandaic:()=>new g(_("giCbDA",!0)),Manichaean:()=>new g(_("g2iCmBFL",!0)),Marchen:()=>new g(_("wjnCfDVCN",!0)),Masaram_Gondi:()=>new g(_("gonCGBCBBCrBBECCBCCBHBJJB",!1)),Medefaidrin:()=>new g(_("gy7C6C",!0)),Meetei_Mayek:()=>new g(_("g3qBWqGtBDJ",!0)),Mende_Kikakui:()=>new g(_("gg6DkGDP",!0)),Meroitic_Cursive:()=>new g(_("gtiCXFTDtB",!0)),Meroitic_Hieroglyphs:()=>new g(_("gsiCf",!0)),Miao:()=>new g(_("g47CqCF4BIQ",!0)),Modi:()=>new g(_("gwlCkCMJ",!0)),Mongolian:()=>new g(_("ggGBBDCCBSBH4CBIqBB2t-BMB",!1)),Mro:()=>new g(_("gy6CeCJFB",!0)),Multani:()=>new g(_("g0kCGBCCCBCBCOBCKB",!1)),Myanmar:()=>new g(_("ggE-EhqmBeiDfxibT",!0)),Nabataean:()=>new g(_("gkiCeJI",!0)),Nag_Mundari:()=>new g(_("wm5DpB",!0)),Nandinagari:()=>new g(_("gtmCHDtBDK",!0)),New_Tai_Lue:()=>new g(_("gsGrBFZHKEB",!0)),Newa:()=>new g(_("gglC7CCE",!0)),Nko:()=>new g(_("g+B6BDC",!0)),Nushu:()=>new g(_("h-7CvsQvsQBqMB",!1)),Nyiakeng_Puachue_Hmong:()=>new g(_("go4DsBENDJFB",!0)),Ogham:()=>new g(_("g0Fc",!0)),Ol_Chiki:()=>new g(_("wiHvB",!0)),Ol_Onal:()=>new g(_("wu5DqBFA",!0)),Old_Hungarian:()=>new g(_("gkjCyBOyBIF",!0)),Old_Italic:()=>new g(_("g4gCjBKC",!0)),Old_North_Arabian:()=>new g(_("g0iCf",!0)),Old_Permic:()=>new g(_("w6gCqB",!0)),Old_Persian:()=>new g(_("g9gCjBFN",!0)),Old_Sogdian:()=>new g(_("g4jCnB",!0)),Old_South_Arabian:()=>new g(_("gziCf",!0)),Old_Turkic:()=>new g(_("ggjCoC",!0)),Old_Uyghur:()=>new g(_("w7jCZ",!0)),Oriya:()=>new g(_("h4CCCHDBDVCGCBCEDIDBDCICFBCEDR",!0)),Osage:()=>new g(_("wlhCjBFjB",!0)),Osmanya:()=>new g(_("gkhCdDJ",!0)),Pahawh_Hmong:()=>new g(_("g46ClCLJCGCUGS",!0)),Palmyrene:()=>new g(_("gjiCf",!0)),Pau_Cin_Hau:()=>new g(_("g2mC4B",!0)),Phags_Pa:()=>new g(_("giqB3B",!0)),Phoenician:()=>new g(_("goiCbEA",!0)),Psalter_Pahlavi:()=>new g(_("g8iCRIDNG",!0)),Rejang:()=>new g(_("wpqBjBMA",!0)),Runic:()=>new g(_("g1FqCEK",!0)),Samaritan:()=>new g(_("ggCtBDO",!0)),Saurashtra:()=>new g(_("gkqBlCJL",!0)),Sharada:()=>new g(_("gskC-ChsCH",!0)),Shavian:()=>new g(_("wihCvB",!0)),Siddham:()=>new g(_("gslC1BDlB",!0)),Sidetic:()=>new g(_("gqiCZ",!0)),SignWriting:()=>new g(_("gg2DrUQECO",!0)),Sinhala:()=>new g(_("hsDCBCRBEXBCIBCDDBFBEFFBEBCCCBGBHJBDCBt-gCTB",!1)),Sogdian:()=>new g(_("w5jCpB",!0)),Sora_Sompeng:()=>new g(_("wmkCYIJ",!0)),Soyombo:()=>new g(_("wymCyC",!0)),Sundanese:()=>new g(_("g8G-BhIH",!0)),Sunuwar:()=>new g(_("g+mChBPJ",!0)),Syloti_Nagri:()=>new g(_("ggqBsB",!0)),Syriac:()=>new g(_("g4BNC7BDCxIK",!0)),Tagalog:()=>new g(_("g4FVKA",!0)),Tagbanwa:()=>new g(_("g7FMCCCB",!0)),Tai_Le:()=>new g(_("wqGdDE",!0)),Tai_Tham:()=>new g(_("gxG+BCcDKHJHN",!0)),Tai_Viet:()=>new g(_("g0qBiCZE",!0)),Tai_Yo:()=>new g(_("g25DeCVJB",!0)),Takri:()=>new g(_("g0lC5BHJ",!0)),Tamil:()=>new g(_("i8CBBCFBECBCDBEBBCCCBEEBEEBBBELBFEBECBCDBDHHPUBm+kCxBBOAB",!1)),Tangsa:()=>new g(_("wz6CuCCJ",!0)),Tangut:()=>new g(_("g-7CgBgBB+3GBhQeBiDyDB",!1)),Telugu:()=>new g(_("ggDMCCCWCPDICCCDIBCCCBDDDJII",!0)),Thaana:()=>new g(_("g8BxB",!0)),Thai:()=>new g(_("hwD5BGb",!0)),Tibetan:()=>new g(_("g4DnCCjBFmBCjBCOCGFB",!0)),Tifinagh:()=>new g(_("wpL3BIBPA",!0)),Tirhuta:()=>new g(_("gklCnCJJ",!0)),Todhri:()=>new g(_("guhCzB",!0)),Tolong_Siki:()=>new g(_("wtnCrBFJ",!0)),Toto:()=>new g(_("w04De",!0)),Tulu_Tigalari:()=>new g(_("g8kCJBCDDClBBCJBCDDCDBCJBCBBJBB",!1)),Ugaritic:()=>new g(_("g8gCdCA",!0)),Unknown:()=>new g(_("4bBBHDBICCVuMuMnBBBzBBBE4B4BBGBcDBHKBvI9B9BBmDmDBMB8BBByBBBQddBCCMEBjBEBuHJJBDDBXXICCBBBFBBKBBDBBFHBCDBDGGBaaBEEHDBDBBXIIDGDBCCGDBDBBECBCGBFCCBFBSJBEKKEXXIDDGBBLIEBCCBNBFBBNGBIEEJBBDBBXIIDGGBKKBDDBEEBFBEDBDGGBTTBIBDHHBBBEFFBBBDCCDCBDCBECBNDBGCBEFFBCCBEBCNBWEBOEEYRRBKKEFFBFBDEEDBBFBBLGBXEEYLLGBBKEEFGBDEBEFFBLLELBOEE0BEEHDBRBBbEETCBZKKCBBICBCDBHCCJFBLBBELB7BDBekBBDCCGZZCYYBGGCIILBBFfBpClBlBBCBoBlBlBQOOBjBBnGCCBDBCBB6LFFBIICFFBqBqBFBBiBFFBIICFFBQQ6BFFBkCkCBhBhBBBBbFB3CBBHBB+UCB6CGBXIBZIBVLBOEEDLB-CBBLFBLFBbFB6CGBsBEBnCJBgBNNBCBNDBCCBrBBBGKBtBDBbFBMCB-BBBiCeeBMMBEBLFBPBBvBBBNTBuCnFnFBGB9BCBQCB-BEBsBBBMHBsBEB3QBBHBBnBBBHBBJGCgBBB2BQQPBBHUUBEEKmDmDNBBcOOBBBjBNBiBOBtEDB7UVBMUB14BBB-LEBuBCCBDBCBB5BGBDNBZIBI4BI-DhBBb6C6CBKB3GZBxC3C3CBoDoDBDBsB-C-C3CIBxBuzcuzcBBB4BIB9KTB5FHB+GTB9BCBLFB5BHBnCHBNFB1DKBfCBvCMMBCBiB4B4BBHBPBBLBBoDXBdJBHBBHBBHIBIII9BDB-DBBLFBl9KLBYDByBjoIBvLBBrDlBBILBGEBbGGCGDrUfBrBFB0BUUFDBGoEoEBCC-FCBHBBHBBHBBECBIIIBIBGBBNbbUDDQBBPhBB8DEBEDBuBCB5COOBBBCuBBvBhEBeCByBOBdDBlBIBfEBsBEBfmBmBBCBPpBB-EBBLFBlBDBlBDBpBHB1BKBNQQIDDMQQIDDBBB1BLB4JIBXJBJXBHrBrBKkCBHBBCtBtBDCBCBBYpCpCBGBKvBBUDDBDBiBCBcEBclBB5BDBVBBzBDDBDBJEEeBBEDBLGBKGBhCfBoBDBNIB3BCBeBBcEBbGBFLBIvCBqC2BB0BMB0BGBvBHBLFBnBCBeHBDvGBgBrBrBEBBDPBHHBKgBBvBHBrBVBblBBdTBYIBvCDBlBIBlCJBCBBaGBLFB2BTTBGBoBIBhDVVBJBTwBwBB8BBICCFQQMFB8BEBLFBFJJBDDBXXIDDGLLBDDBEEBCCBEBCEBIBBICBGKBLCCBCCnBLLCBBCFFLDDBGBDcB9CGGBcBpCHBLlFB3BBBnBhBBmCKBLFBOSB7BFBLFBVbBcBBQDBY4FB9BjDB0CLBJBBCBBJDDfDDBNNBHBLlCBJBBvBBBMaBpCHB0CMBqCGBL1CBJ3CBjBNBLFBKuBuBPJBeCBhBBBXPPBnCBIDDtBCBCDDKHBLFBHDDmBDDHGBLFBtBDBL1HBaGBSqBqBBBBe0CBCOBzBMB8clDBwDGGBJBlGryCBkDMB3iBJB88DEBoS41GB7Bl2BB6RGBgBLLBCByCLLBEBfBBHJBnCJBLIIWEBUvNB7BlGB8CEBaBBarBBsCDB6BGBS-BBGKBIIB3mHoBBhBgDB0D8vIBFIIDkJkJBNBCcBEBBCNBFHBtMjoCBsDEBOCBKGBLBBJ76DB+HCB1NFBYOBSOBvBBBYIB1D7BB3HJBoBBBjGUBnC5DBVLBVLB4CIBamEB2CoCoCDBBCBBDBBFNNCIIiCFFBJJIddFGGCCBI1K1KBlJlJB-V-VBNBGQQBuiBBgBFBH0GBISSBIIDGGBDB-BgBBCvDBuBCBPBBLDBD-JBgBQB7BEBCvOBrB1GBsBDBC-FBgBXXBGBD-GBIFFDQQmGBBRoBBtCDBLDBDwYBlCrCB+BhGBFccDCCBCCLFFCCCBEBCDBCECEDDCBBCICDCCBFFIKFCLLSEBEGGSzBBDtIBtBDBlDLBQBBQQQmBJBvF3BBeMBtBDBKGBDNBH5EB6eCBSCBOCB7GFBNDBCOBNDB5BHBLFBpBHBfBBNDBDNBKmBB5KHBPBBOCBMCB6BCCBCBRBBNDBLGB0EoDoDBjgBBh3pBfB-oEBBv0FBBypHOBvThtCB-QhvBBs6EEBrpIm8yVBCdBhD-DBxHvw-FB",!1)),Vai:()=>new g(_("gopBrJ",!0)),Vithkuqi:()=>new g(_("wrhCKCOCGCBCKCOCGCB",!0)),Wancho:()=>new g(_("g24D5BGA",!0)),Warang_Citi:()=>new g(_("glmCyCNA",!0)),Yezidi:()=>new g(_("g0jCpBCCDB",!0)),Yi:()=>new g(_("ggoBskBE2B",!0)),Zanabazar_Square:()=>new g(_("gwmCnC",!0))});static FOLD_CATEGORIES=new Ma({L:()=>new g(_("laA",!0)),LC:()=>new g(_("laA",!0)),Ll:()=>new g(_("hCZBmDWBCGBiBuBCEECDOCDuBCBECEBBCCCBCCBBBDDBCBBCCBEBBCBBCECBCCDCCBCCBBBCCCBEEIBBCBBCBBCOCDQCDBBCCCBBBC4BCIBBCBBDCCBCBCGC3HrBrBCEEJHHCCBCCCBCCBPBCIBkBJJCUCGDDCBBDyBBxBgBCK2BCBMCD+CCDlBBq6ClBBCGGzW1CB0kCHHBpBBDCBhK0ECKgDCKHBJFBLHBJHBJFBMGCJHBZHBJHBJHBJEBMEBMDBNEBMEBqJEEBHHxC9zC9zCBuBBxBCCBBBDGCBCBCDDJCBCgDCJCCFuqeuqeCqBCUaCoEMCE8BCLECBICFCCDCCEUCBDBCEBCOCBCBCCCBQCZs5Vs5VBYBmmBnBBpEjBB9EKBCOBCGBCBBr3ByBB+EVB75CfBhsVfBhCYBoyehBB",!1)),Lt:()=>new g(_("kOCCBCCBCClBCCtsHHBJHBJHBMQQwBAB",!1)),Lu:()=>new g(_("hDZB7BqBqBBWBCHBCuBCEECDOCDsBCDECBBBDCCDEEGDDECBDDDCCCDFFDEECDDECCGBBCBBCBBCOCBSCDBBCEECkBCEQCJDDBCCFICBEBCBBCCCBEEBCCBCBCEBDCCBDDIDDCBBEFBGLLBnFnFsBCCEEEBBBvBDBCdBCBBECBCWCBDBCGD1BvBBCgBCK0BCDMCBgDCyBlBBq6CqBBDCB5XFBjkCIBCvHvHERRzD0ECGGGC8CCBHBJFBLHBJHBJFBMGCJHBJNBzBBBNSSBPPBEEpL2B2Bs1CvBBCEEBGCHDDLiDCJCCFNNBkBBCGG0oesBCUaCoEMCE8BCLCCDICFFFCBBDSCMOCFCCDOCb9a9advCBi8UZBumBnBBpEjBB8EKBCOBCGBCBBk4ByBB+DVB75CfBhsVfB8BYBvyehBB",!1)),M:()=>new g(_("5cgBgBlgHAB",!1)),Mn:()=>new g(_("5cgBgBlgHAB",!1)),Emoji:()=>new g(_("8mJA",!0)),Extended_Pictographic:()=>new g(_("8mJA",!0)),Lowercase:()=>new g(_("hCZBmDWBCGBiBuBCEECDOCDuBCBECEBBCCCBCCBBBDDBCBBCCBEBBCBBCECBCCDCCBCCBBBCCCBEEIBBCBBCBBCOCDQCDBBCCCBBBC4BCIBBCBBDCCBCBCGCiJCCEJJHCCBBBCCCBCCBPBCIBkBJJCUCGDDCBBDyBBxBgBCK2BCBMCD+CCDlBBq6ClBBCGGzW1CB0kCHHBpBBDCBhK0ECKgDCKHBJFBLHBJHBJFBMGCJHBZHBJHBJHBJEBMEBMDBNEBMEBqJEEBHHuBPBUzZzZBYBx5BvBBxBCCBBBDGCBCBCDDJCBCgDCJCCFuqeuqeCqBCUaCoEMCE8BCLECBICFCCDCCEUCBDBCEBCOCBCBCCCBQCZs5Vs5VBYBmmBnBBpEjBB9EKBCOBCGBCBBr3ByBB+EVB75CfBhsVfBhCYBoyehBB",!1)),Math:()=>new g(_("ycGDCHHFMMDDDCHHFAB",!1)),Uppercase:()=>new g(_("hDZB7BqBqBBWBCHBCuBCEECDOCDsBCDECBBBDCCDEEGDDECBDDDCCCDFFDEECDDECCGBBCBBCBBCOCBSCDBBCEECkBCEQCJDDBCCFICBEBCBBCCCBEEBCCBCBCEBDCCBDDIDDCBBEFBGLLBnFnFsBCCEEEBBBvBDBCdBCBBECBCWCBDBCGD1BvBBCgBCK0BCDMCBgDCyBlBBq6CqBBDCB5XFBjkCIBCvHvHERRzD0ECGGGC8CCBHBJFBLHBJHBJFBMGCJHBJNBzBBBNSSBPPBEEpLiBiBBOBFsasaBYBn6BvBBCEEBGCHDDLiDCJCCFNNBkBBCGG0oesBCUaCoEMCE8BCLCCDICFFFCBBDSCMOCFCCDOCb9a9advCBi8UZBumBnBBpEjBB8EKBCOBCGBCBBk4ByBB+DVB75CfBhsVfB8BYBvyehBB",!1))});static FOLD_SCRIPT=new Ma({Common:()=>new g(_("8cgBgB",!1)),Greek:()=>new g(_("1FwUwU",!1)),Inherited:()=>new g(_("5cgBgBlgHAB",!1))})},$=class Mt{static MAX_RUNE=1114111;static MAX_ASCII=127;static MAX_LATIN1=255;static MAX_BMP=65535;static MIN_FOLD=65;static MAX_FOLD=125251;static MIN_HIGH_SURROGATE=55296;static MAX_HIGH_SURROGATE=56319;static MIN_LOW_SURROGATE=56320;static MAX_LOW_SURROGATE=57343;static MIN_SUPPLEMENTARY_CODE_POINT=65536;static is32(e,t){let n=0,s=e.length;for(;n<s;){const i=n+Math.floor((s-n)/2),o=e.getLo(i),a=e.getHi(i);if(o<=t&&t<=a){const c=e.getStride(i);return(t-o)%c===0}t<o?s=i:n=i+1}return!1}static is(e,t){if(t<=Mt.MAX_LATIN1){for(let n=0;n<e.length;n++){if(t>e.getHi(n))continue;const s=e.getLo(n);if(t<s)return!1;const i=e.getStride(n);return(t-s)%i===0}return!1}return e.length>0&&t>=e.getLo(0)&&Mt.is32(e,t)}static isUpper(e){if(e<=Mt.MAX_LATIN1){const t=String.fromCodePoint(e);return t.toUpperCase()===t&&t.toLowerCase()!==t}return Mt.is(gt.Upper,e)}static isPrint(e){return e<=Mt.MAX_LATIN1?e>=32&&e<Mt.MAX_ASCII||e>=161&&e!==173:Mt.is(gt.Print,e)}static simpleFold(e){if(gt.CASE_ORBIT.has(e))return gt.CASE_ORBIT.get(e);const t=L.toLowerCase(e);return t!==e?t:L.toUpperCase(e)}static equalsIgnoreCase(e,t){if(e===t)return!0;if(e<0||t<0)return!1;if(e<=Mt.MAX_ASCII&&t<=Mt.MAX_ASCII)return 65<=e&&e<=90&&(e|=32),65<=t&&t<=90&&(t|=32),e===t;for(let n=Mt.simpleFold(e);n!==e;n=Mt.simpleFold(n))if(n===t)return!0;return!1}};const QB=256,vm=new Uint8Array(QB);for(let r=0;r<QB;r++)vm[r]=97<=r&&r<=122||65<=r&&r<=90||48<=r&&r<=57||r===95?1:0;let Il=null,Dl=null;var Z=class vt{static METACHARACTERS="\\.+*?()|[]{}^$";static EMPTY_BEGIN_LINE=1;static EMPTY_END_LINE=2;static EMPTY_BEGIN_TEXT=4;static EMPTY_END_TEXT=8;static EMPTY_WORD_BOUNDARY=16;static EMPTY_NO_WORD_BOUNDARY=32;static EMPTY_ALL=-1;static emptyInts(){return[]}static isByteArray(e){return Array.isArray(e)||e instanceof Uint8Array}static isalnum(e){return L.CODES.get("0")<=e&&e<=L.CODES.get("9")||L.CODES.get("a")<=e&&e<=L.CODES.get("z")||L.CODES.get("A")<=e&&e<=L.CODES.get("Z")}static unhex(e){return L.CODES.get("0")<=e&&e<=L.CODES.get("9")?e-L.CODES.get("0"):L.CODES.get("a")<=e&&e<=L.CODES.get("f")?e-L.CODES.get("a")+10:L.CODES.get("A")<=e&&e<=L.CODES.get("F")?e-L.CODES.get("A")+10:-1}static escapeRune(e){let t="";if($.isPrint(e))vt.METACHARACTERS.indexOf(String.fromCodePoint(e))>=0&&(t+="\\"),t+=String.fromCodePoint(e);else switch(e){case L.CODES.get('"'):t+='\\"';break;case L.CODES.get("\\"):t+="\\\\";break;case L.CODES.get("	"):t+="\\t";break;case L.CODES.get(`
`):t+="\\n";break;case L.CODES.get("\r"):t+="\\r";break;case L.CODES.get("\b"):t+="\\b";break;case L.CODES.get("\f"):t+="\\f";break;default:{let n=e.toString(16);e<256?(t+="\\x",n.length===1&&(t+="0"),t+=n):t+=`\\x{${n}}`;break}}return t}static stringToRunes(e){const t=String(e),n=[];let s=0;for(;s<t.length;){const i=t.codePointAt(s);n.push(i),s+=i>$.MAX_BMP?2:1}return n}static runeToString(e){return String.fromCodePoint(e)}static isWordRune(e){return e<QB?vm[e]===1:!1}static emptyOpContext(e,t){let n=0;return e<0&&(n|=vt.EMPTY_BEGIN_TEXT|vt.EMPTY_BEGIN_LINE),e===10&&(n|=vt.EMPTY_BEGIN_LINE),t<0&&(n|=vt.EMPTY_END_TEXT|vt.EMPTY_END_LINE),t===10&&(n|=vt.EMPTY_END_LINE),vt.isWordRune(e)!==vt.isWordRune(t)?n|=vt.EMPTY_WORD_BOUNDARY:n|=vt.EMPTY_NO_WORD_BOUNDARY,n}static quoteMeta(e){return e.split("").map(t=>vt.METACHARACTERS.indexOf(t)>=0?`\\${t}`:t).join("")}static charCount(e){return e>$.MAX_BMP?2:1}static toArray(e){const t=e.length,n=new Array(t);for(let s=0;s<t;s++)n[s]=e[s];return n}static stringToUtf8ByteArray(e){if(globalThis.TextEncoder)return Il||(Il=new TextEncoder),Il.encode(e);{let t=[],n=0;for(let s=0;s<e.length;s++){let i=e.charCodeAt(s);i<128?t[n++]=i:i<2048?(t[n++]=i>>6|192,t[n++]=i&63|128):(i&64512)===$.MIN_HIGH_SURROGATE&&s+1<e.length&&(e.charCodeAt(s+1)&64512)===$.MIN_LOW_SURROGATE?(i=$.MIN_SUPPLEMENTARY_CODE_POINT+((i&1023)<<10)+(e.charCodeAt(++s)&1023),t[n++]=i>>18|240,t[n++]=i>>12&63|128,t[n++]=i>>6&63|128,t[n++]=i&63|128):(t[n++]=i>>12|224,t[n++]=i>>6&63|128,t[n++]=i&63|128)}return t}}static utf8ByteArrayToString(e){if(globalThis.TextDecoder){Dl||(Dl=new TextDecoder("utf-8"));const t=e instanceof Uint8Array?e:new Uint8Array(e);return Dl.decode(t)}else{let t=[],n=0,s=0;for(;n<e.length;){let i=e[n++];if(i<128)t[s++]=String.fromCharCode(i);else if(i>191&&i<224){let o=e[n++];t[s++]=String.fromCharCode((i&31)<<6|o&63)}else if(i>239&&i<365){let o=e[n++],a=e[n++],c=e[n++],l=((i&7)<<18|(o&63)<<12|(a&63)<<6|c&63)-$.MIN_SUPPLEMENTARY_CODE_POINT;t[s++]=String.fromCharCode($.MIN_HIGH_SURROGATE+(l>>10)),t[s++]=String.fromCharCode($.MIN_LOW_SURROGATE+(l&1023))}else{let o=e[n++],a=e[n++];t[s++]=String.fromCharCode((i&15)<<12|(o&63)<<6|a&63)}}return t.join("")}}};const Rm=(r=[],e=0)=>{const t=Object.create(null);for(let n=0;n<r.length;n++){const s=r[n],i=e+n;t[s]=i,t[i]=s}return Object.freeze(t)};var cs=class tB{static Encoding=Rm(["UTF_16","UTF_8"]);getEncoding(){throw Error("not implemented")}asCharSequence(){throw Error("not implemented")}asBytes(){throw Error("not implemented")}length(){throw Error("not implemented")}isUTF8Encoding(){return this.getEncoding()===tB.Encoding.UTF_8}isUTF16Encoding(){return this.getEncoding()===tB.Encoding.UTF_16}},hp=class extends cs{constructor(r=null){super(),this.bytes=r}getEncoding(){return cs.Encoding.UTF_8}asCharSequence(){return Z.utf8ByteArrayToString(this.bytes)}asBytes(){return this.bytes}length(){return this.bytes.length}},lw=class extends cs{constructor(r=null){super(),this.charSequence=r}getEncoding(){return cs.Encoding.UTF_16}asCharSequence(){return this.charSequence}asBytes(){return Z.stringToUtf8ByteArray(this.charSequence.toString())}length(){return this.charSequence.length}},Qr=class{static utf16(r){return new lw(r)}static utf8(r){return Z.isByteArray(r)?new hp(r):new hp(Z.stringToUtf8ByteArray(r))}},ht=class{static EOF(){return-8}constructor(){this.end=0}canCheckPrefix(){return!0}endPos(){return this.end}hasString(){return!1}hasAnyString(){return!1}prefixLength(){return 0}},Bw=class extends ht{constructor(r,e=0,t=r.length){super(),this.bytes=r,this.start=e,this.end=t}hasString(r,e){const t=r.bytes;if(t.length===0)return!0;const n=this.indexOf(this.bytes,t,this.start+e);return n!==-1&&n<=this.end-t.length}hasAnyString(r,e){return r.ac8?r.ac8.searchUTF8(this.bytes,this.start+e,this.end):!1}step(r){if(r+=this.start,r>=this.end)return ht.EOF();const e=this.bytes[r]&255;if(e<128)return e<<3|1;if(e>=194&&e<=223&&r+1<this.end){const t=this.bytes[r+1]&255;return(t&192)!==128?e<<3|1:((e&31)<<6|t&63)<<3|2}else if(e>=224&&e<=239&&r+2<this.end){const t=this.bytes[r+1]&255;if((t&192)!==128)return e<<3|1;const n=this.bytes[r+2]&255;return(n&192)!==128?e<<3|1:((e&15)<<12|(t&63)<<6|n&63)<<3|3}else if(e>=240&&e<=244&&r+3<this.end){const t=this.bytes[r+1]&255;if((t&192)!==128)return e<<3|1;const n=this.bytes[r+2]&255;if((n&192)!==128)return e<<3|1;const s=this.bytes[r+3]&255;return(s&192)!==128?e<<3|1:((e&7)<<18|(t&63)<<12|(n&63)<<6|s&63)<<3|4}else return e<<3|1}index(r,e){e+=this.start;const t=this.indexOf(this.bytes,r.prefixUTF8,e);return t<0?t:t-e}context(r){r+=this.start;let e=-1;if(r>this.start&&r<=this.end){let n=r-1;if(e=this.bytes[n--],e>=128){let s=r-4;for(s<this.start&&(s=this.start);n>=s&&(this.bytes[n]&192)===128;)n--;n<this.start&&(n=this.start),e=this.step(n-this.start)>>3}}const t=r<this.end?this.step(r-this.start)>>3:-1;return Z.emptyOpContext(e,t)}indexOf(r,e,t=0){let n=e.length;if(n===0)return t<=this.end?t:-1;const s=e[0];let i=this.end-n;const o=typeof r.indexOf=="function";let a=t;for(;a<=i;){if(o){if(a=r.indexOf(s,a),a===-1||a>i)return-1}else{for(;a<=i&&r[a]!==s;)a++;if(a>i)return-1}let c=!0;for(let l=1;l<n;l++)if(r[a+l]!==e[l]){c=!1;break}if(c)return a;a++}return-1}prefixLength(r){return r.prefixUTF8.length}},hw=class extends ht{constructor(r,e=0,t=r.length){super(),this.charSequence=r,this.start=e,this.end=t}hasString(r,e){const t=this.charSequence.indexOf(r.str,this.start+e);return t!==-1&&t<=this.end-r.str.length}hasAnyString(r,e){return r.ac16?r.ac16.searchUTF16(this.charSequence,this.start+e,this.end):!1}step(r){if(r+=this.start,r>=this.end)return ht.EOF();const e=this.charSequence.charCodeAt(r);if(e<$.MIN_HIGH_SURROGATE||e>$.MAX_HIGH_SURROGATE||r+1>=this.end)return e<<3|1;const t=this.charSequence.charCodeAt(r+1);return t>=$.MIN_LOW_SURROGATE&&t<=$.MAX_LOW_SURROGATE?(e-$.MIN_HIGH_SURROGATE)*1024+(t-$.MIN_LOW_SURROGATE)+$.MIN_SUPPLEMENTARY_CODE_POINT<<3|2:e<<3|1}index(r,e){e+=this.start;const t=this.charSequence.indexOf(r.prefix,e);return t<0||t>this.end-r.prefix.length?-1:t-e}context(r){r+=this.start;const e=r>this.start&&r<=this.end?this.charSequence.charCodeAt(r-1):-1,t=r<this.end?this.charSequence.charCodeAt(r):-1;return Z.emptyOpContext(e,t)}prefixLength(r){return r.prefix.length}},we=class{static fromUTF8(r,e=0,t=r.length){return new Bw(r,e,t)}static fromUTF16(r,e=0,t=r.length){return new hw(r,e,t)}},ta=class extends Error{constructor(r){super(r),this.name="RE2JSException"}},De=class extends ta{constructor(r,e=null){let t=`error parsing regexp: ${r}`;e&&(t+=`: \`${e}\``),super(t),this.name="RE2JSSyntaxException",this.message=t,this.error=r,this.input=e}getDescription(){return this.error}getPattern(){return this.input}},fw=class extends ta{constructor(r){super(r),this.name="RE2JSCompileException"}},Ct=class extends ta{constructor(r){super(r),this.name="RE2JSGroupException"}},dw=class extends ta{constructor(r){super(r),this.name="RE2JSFlagsException"}},lo=class extends ta{constructor(r){super(r),this.name="RE2JSInternalException"}},fp=class bm{static MAX_REPLACER_ARGS=65535;static quoteReplacement(e,t=!1){return t?e.indexOf("\\")<0&&e.indexOf("$")<0?e:e.split("").map(n=>{const s=n.codePointAt(0);return s===L.CODES.get("\\")||s===L.CODES.get("$")?`\\${n}`:n}).join(""):e.indexOf("$")<0?e:e.split("").map(n=>n.codePointAt(0)===L.CODES.get("$")?"$$":n).join("")}constructor(e,t){if(e===null)throw new Error("pattern is null");this.patternInput=e;const n=this.patternInput.re2();this.patternGroupCount=n.numberOfCapturingGroups(),this.groups=[],this.namedGroups=n.namedGroups,this.numberOfInstructions=n.numberOfInstructions(),t instanceof cs?this.resetMatcherInput(t):Z.isByteArray(t)?this.resetMatcherInput(Qr.utf8(t)):this.resetMatcherInput(Qr.utf16(t))}pattern(){return this.patternInput}reset(){return this.matcherInputLength=this.matcherInput.length(),this.appendPos=0,this.hasMatch=!1,this.hasGroups=!1,this.anchorFlag=0,this}resetMatcherInput(e){if(e===null)throw new Error("input is null");return e instanceof cs||(Z.isByteArray(e)?e=Qr.utf8(e):e=Qr.utf16(e)),this.matcherInput=e,this.reset(),this}start(e=0){if(typeof e=="string"){const t=this.namedGroups[e];if(!Number.isFinite(t))throw new Ct(`group '${e}' not found`);e=t}return this.loadGroup(e),this.groups[2*e]}end(e=0){if(typeof e=="string"){const t=this.namedGroups[e];if(!Number.isFinite(t))throw new Ct(`group '${e}' not found`);e=t}return this.loadGroup(e),this.groups[2*e+1]}programSize(){return this.numberOfInstructions}group(e=0){if(typeof e=="string"){const s=this.namedGroups[e];if(!Number.isFinite(s))throw new Ct(`group '${e}' not found`);e=s}const t=this.start(e),n=this.end(e);return t<0&&n<0?null:this.substring(t,n)}getNamedGroups(){if(!this.hasMatch)throw new Ct("perhaps no match attempted");const e=Object.create(null);for(const t of Object.keys(this.namedGroups))e[t]=this.group(t);return e}groupCount(){return this.patternGroupCount}loadGroup(e){if(e<0||e>this.patternGroupCount)throw new Ct(`Group index out of bounds: ${e}`);if(!this.hasMatch)throw new Ct("perhaps no match attempted");if(e===0||this.hasGroups)return;const t=this.matcherInputLength,n=this.patternInput.re2().matchMachineInput(this.matcherInput,this.groups[0],t,this.anchorFlag,1+this.patternGroupCount);if(!n[0])throw new Ct("inconsistency in matching group data");this.groups=n[1],this.hasGroups=!0}matches(){return this.genMatch(0,M.ANCHOR_BOTH)}lookingAt(){return this.genMatch(0,M.ANCHOR_START)}find(e=null){if(e!==null){if(e<0||e>this.matcherInputLength)throw new Ct(`start index out of bounds: ${e}`);return this.reset(),this.genMatch(e,0)}if(e=0,this.hasMatch&&(e=this.groups[1],this.groups[0]===this.groups[1])){const t=(this.matcherInput.isUTF16Encoding()?we.fromUTF16(this.matcherInput.asCharSequence(),0,this.matcherInputLength):we.fromUTF8(this.matcherInput.asBytes(),0,this.matcherInputLength)).step(e);t<0?e++:e+=t&7}return this.genMatch(e,M.UNANCHORED)}genMatch(e,t){const n=this.patternInput.re2().matchMachineInput(this.matcherInput,e,this.matcherInputLength,t,1);return n[0]?(this.groups=n[1],this.hasMatch=!0,this.hasGroups=this.patternGroupCount===0,this.anchorFlag=t,!0):(this.hasMatch=!1,!1)}substring(e,t){return this.matcherInput.isUTF8Encoding()?Z.utf8ByteArrayToString(this.matcherInput.asBytes().slice(e,t)):this.matcherInput.asCharSequence().substring(e,t).toString()}inputLength(){return this.matcherInputLength}appendReplacement(e,t=!1){let n="";const s=this.start(),i=this.end();return this.appendPos<s&&(n+=this.substring(this.appendPos,s)),this.appendPos=i,n+=t?this.appendReplacementInternalJava(e):this.appendReplacementInternalJs(e),n}appendReplacementInternalJava(e){let t="",n=0;const s=e.length;let i=0;for(;i<s;){const o=e.codePointAt(i);if(o===L.CODES.get("\\")){if(n<i&&(t+=e.substring(n,i)),i++,i>=s)throw new Ct("character to be escaped is missing");n=i,i++;continue}if(o===L.CODES.get("$")){if(n<i&&(t+=e.substring(n,i)),i+1>=s)throw new Ct("Illegal group reference: group index is missing");const a=e.codePointAt(i+1);if(L.CODES.get("0")<=a&&a<=L.CODES.get("9")){let c=a-L.CODES.get("0"),l=i+2;for(;l<s;l++){const f=e.codePointAt(l);if(f<L.CODES.get("0")||f>L.CODES.get("9")||c*10+f-L.CODES.get("0")>this.patternGroupCount)break;c=c*10+f-L.CODES.get("0")}if(c>this.patternGroupCount)throw new Ct(`n > number of groups: ${c}`);const B=this.group(c);B!==null&&(t+=B),i=l,n=i}else if(a===L.CODES.get("{")){let c=i+2;for(;c<s&&e.codePointAt(c)!==L.CODES.get("}");)c++;if(c>=s)throw new Ct("named capture group is missing trailing '}'");const l=e.substring(i+2,c),B=this.group(l);B!==null&&(t+=B),i=c+1,n=i}else throw new Ct("Illegal group reference");continue}i++}return n<s&&(t+=e.substring(n,s)),t}appendReplacementInternalJs(e){let t="",n=0;const s=e.length;for(let i=0;i<s-1;i++)if(e.codePointAt(i)===L.CODES.get("$")){let o=e.codePointAt(i+1);if(L.CODES.get("$")===o){n<i&&(t+=e.substring(n,i)),t+="$",i++,n=i+1;continue}else if(L.CODES.get("&")===o){n<i&&(t+=e.substring(n,i));const a=this.group(0);a!==null?t+=a:t+="$&",i++,n=i+1;continue}else if(L.CODES.get("`")===o){n<i&&(t+=e.substring(n,i)),t+=this.substring(0,this.start(0)),i++,n=i+1;continue}else if(L.CODES.get("'")===o){n<i&&(t+=e.substring(n,i)),t+=this.substring(this.end(0),this.matcherInputLength),i++,n=i+1;continue}else if(L.CODES.get("1")<=o&&o<=L.CODES.get("9")){let a=o-L.CODES.get("0");for(n<i&&(t+=e.substring(n,i)),i+=2;i<s&&(o=e.codePointAt(i),!(o<L.CODES.get("0")||o>L.CODES.get("9")||a*10+o-L.CODES.get("0")>this.patternGroupCount));i++)a=a*10+o-L.CODES.get("0");if(a>this.patternGroupCount){t+=`$${a}`,n=i,i--;continue}const c=this.group(a);c!==null&&(t+=c),n=i,i--;continue}else if(o===L.CODES.get("<")){n<i&&(t+=e.substring(n,i)),i++;let a=i+1;for(;a<e.length&&e.codePointAt(a)!==L.CODES.get(">")&&e.codePointAt(a)!==L.CODES.get(" ");)a++;if(a===e.length||e.codePointAt(a)!==L.CODES.get(">")){t+=e.substring(i-1,a+1),n=a+1,i=a;continue}const c=e.substring(i+1,a);if(Object.prototype.hasOwnProperty.call(this.namedGroups,c)){const l=this.group(c);l!==null&&(t+=l)}else t+=`$<${c}>`;n=a+1,i=a;continue}}return n<s&&(t+=e.substring(n,s)),t}appendTail(){return this.substring(this.appendPos,this.matcherInputLength)}replaceAll(e,t=!1){return this.replace(e,!0,t)}replaceFirst(e,t=!1){return this.replace(e,!1,t)}replace(e,t=!0,n=!1){let s="";this.reset();const i=typeof e=="function",o=Object.keys(this.namedGroups).length>0;let a=null;if(i){if(this.groupCount()>=bm.MAX_REPLACER_ARGS)throw new Ct("Too many capture groups to safely invoke replacer function");a=this.matcherInput.isUTF8Encoding()?this.matcherInput.asBytes():this.matcherInput.asCharSequence()}for(;this.find()&&(s+=i?this.appendReplacementFunc(e,o,a):this.appendReplacement(e,n),!!t););return s+=this.appendTail(),s}appendReplacementFunc(e,t,n){let s="";const i=this.start(),o=this.end();this.appendPos<i&&(s+=this.substring(this.appendPos,i)),this.appendPos=o;const a=this.buildReplacerArgs(i,t,n);return s+=String(e(...a)),s}buildReplacerArgs(e,t,n){const s=[this.group(0)],i=this.groupCount();for(let o=1;o<=i;o++){const a=this.start(o);a<0?s.push(void 0):s.push(this.substring(a,this.end(o)))}if(s.push(e),s.push(n),t){const o=this.getNamedGroups();for(const a in o)o[a]===null&&(o[a]=void 0);s.push(o)}return s}},k=class Ke{static ALT=1;static ALT_MATCH=2;static CAPTURE=3;static EMPTY_WIDTH=4;static FAIL=5;static MATCH=6;static NOP=7;static RUNE=8;static RUNE1=9;static RUNE_ANY=10;static RUNE_ANY_NOT_NL=11;static LB_WRITE=12;static LB_CHECK=13;static isRuneOp(e){return Ke.RUNE<=e&&e<=Ke.RUNE_ANY_NOT_NL}static escapeRunes(e){let t='"';for(let n of e)t+=Z.escapeRune(n);return t+='"',t}constructor(e){this.op=e,this.out=0,this.arg=0,this.runes=[],this.next=null}matchRune(e){if(this.runes.length===1){const o=this.runes[0];return(this.arg&M.FOLD_CASE)!==0?$.equalsIgnoreCase(o,e):e===o}const t=this.runes.length;if(t===0)return!1;if(t===2||t===4||t===6||t===8){for(let o=0;o<t;o+=2){if(e<this.runes[o])return!1;if(e<=this.runes[o+1])return!0}return!1}let n=0,s=t>>1;for(;s>1;){const o=s>>1;n+=this.runes[n+o<<1]<=e?o:0,s-=o}n+=this.runes[n<<1]<=e?1:0;const i=n-1;return i>=0&&e<=this.runes[i<<1|1]}matchRunePos(e){if(this.runes.length===1){const o=this.runes[0];return(this.arg&M.FOLD_CASE)!==0?$.equalsIgnoreCase(o,e)?0:-1:e===o?0:-1}const t=this.runes.length;if(t===0)return-1;if(t===2||t===4||t===6||t===8){for(let o=0;o<t;o+=2){if(e<this.runes[o])return-1;if(e<=this.runes[o+1])return Math.floor(o/2)}return-1}let n=0,s=t>>1;for(;s>1;){const o=s>>1;n+=this.runes[n+o<<1]<=e?o:0,s-=o}n+=this.runes[n<<1]<=e?1:0;const i=n-1;return i>=0&&e<=this.runes[i<<1|1]?i:-1}toString(){switch(this.op){case Ke.ALT:return`alt -> ${this.out}, ${this.arg}`;case Ke.ALT_MATCH:return`altmatch -> ${this.out}, ${this.arg}`;case Ke.CAPTURE:return`cap ${this.arg} -> ${this.out}`;case Ke.EMPTY_WIDTH:return`empty ${this.arg} -> ${this.out}`;case Ke.MATCH:return`match${this.arg!==0?` ${this.arg}`:""}`;case Ke.FAIL:return"fail";case Ke.NOP:return`nop -> ${this.out}`;case Ke.LB_WRITE:return`lbwrite ${this.arg} -> ${this.out}`;case Ke.LB_CHECK:return`lbcheck ${this.arg} -> ${this.out}`;case Ke.RUNE:return this.runes===null?"rune <null>":["rune ",Ke.escapeRunes(this.runes),(this.arg&M.FOLD_CASE)!==0?"/i":""," -> ",this.out].join("");case Ke.RUNE1:return`rune1 ${Ke.escapeRunes(this.runes)} -> ${this.out}`;case Ke.RUNE_ANY:return`any -> ${this.out}`;case Ke.RUNE_ANY_NOT_NL:return`anynotnl -> ${this.out}`;default:throw new Error("unhandled case in Inst.toString")}}},dp=class{constructor(r){this.sparse=new Int32Array(r),this.densePcs=new Int32Array(r),this.denseCaps=null,this.size=0,this.ncap=0}init(r){this.ncap=r;const e=this.densePcs.length*r;(!this.denseCaps||this.denseCaps.length<e)&&(this.denseCaps=new Int32Array(e))}contains(r){const e=this.sparse[r];return e<this.size&&this.densePcs[e]===r}isEmpty(){return this.size===0}add(r){const e=this.size++;return this.sparse[r]=e,this.densePcs[e]=r,e}clear(){this.size=0}toString(){let r="{";for(let e=0;e<this.size;e++)e!==0&&(r+=", "),r+=this.densePcs[e];return r+="}",r}},pw=class nB{static fromRE2(e){const t=new nB;return t.prog=e.prog,t.re2=e,t.q0=new dp(t.prog.numInst()),t.q1=new dp(t.prog.numInst()),t.matched=!1,t.matchcap=new Int32Array(t.prog.numCap<2?2:t.prog.numCap),t.ncap=0,t}static fromMachine(e){return nB.fromRE2(e.re2)}constructor(){this.prog=null,this.re2=null,this.q0=null,this.q1=null,this.matched=!1,this.matchcap=null,this.ncap=0,this.lbTable=null}init(e){this.ncap=e,e>this.matchcap.length?this.matchcap=new Int32Array(e).fill(-1):this.matchcap.fill(-1),this.q0.init(e),this.q1.init(e),this.prog.numLb>0&&((!this.lbTable||this.lbTable.length<this.prog.numLb+1)&&(this.lbTable=new Int32Array(this.prog.numLb+1)),this.lbTable.fill(-1))}submatches(){return this.ncap===0?Z.emptyInts():Z.toArray(this.matchcap.subarray(0,this.ncap))}match(e,t,n){const s=this.re2.cond;if(s===Z.EMPTY_ALL||(n===M.ANCHOR_START||n===M.ANCHOR_BOTH)&&t!==0)return!1;this.matched=!1,this.matchcap.fill(-1);let i=this.prog.numLb>0?0:t,o=t,a=this.q0,c=this.q1,l=e.step(i),B=l>>3,f=l&7,p=-1,m=0;l!==ht.EOF()&&(l=e.step(i+f),p=l>>3,m=l&7);let y;for(i===0?y=Z.emptyOpContext(-1,B):y=e.context(i);;){if(a.isEmpty()){if((s&Z.EMPTY_BEGIN_TEXT)!==0&&i!==0||(n===M.ANCHOR_START||n===M.ANCHOR_BOTH)&&i!==0||this.matched)break;if(this.prog.numLb===0&&this.re2.prefix.length!==0&&p!==this.re2.prefixRune&&e.canCheckPrefix()){const j=e.index(this.re2,i);if(j<0)break;i+=j,l=e.step(i),B=l>>3,f=l&7,l=e.step(i+f),p=l>>3,m=l&7,y=e.context(i)}}if(i===0&&this.prog.numLb>0)for(let j=0;j<this.prog.lbStarts.length;j++)this.add(a,this.prog.lbStarts[j],i,this.matchcap,0,y);!this.matched&&(i===0||n===M.UNANCHORED)&&i>=o&&(this.ncap>0&&(this.matchcap[0]=i),this.add(a,this.prog.start,i,this.matchcap,0,y));const F=i+f;if(y=e.context(F),this.step(a,c,i,F,B,y,n,i===e.endPos()),f===0||this.ncap===0&&this.matched)break;i+=f,B=p,f=m,B!==-1&&(l=e.step(i+f),p=l>>3,m=l&7);const V=a;a=c,c=V}return c.clear(),this.matched}matchSet(e,t,n){const s=this.re2.cond;if(s===Z.EMPTY_ALL)return[];if((n===M.ANCHOR_START||n===M.ANCHOR_BOTH)&&t!==0)return[];let i=this.prog.numLb>0?0:t,o=t,a=this.q0,c=this.q1,l=e.step(i),B=l>>3,f=l&7,p=-1,m=0;l!==ht.EOF()&&(l=e.step(i+f),p=l>>3,m=l&7);let y=i===0?Z.emptyOpContext(-1,B):e.context(i);const F=new Set;for(;!(a.isEmpty()&&((s&Z.EMPTY_BEGIN_TEXT)!==0&&i!==0||(n===M.ANCHOR_START||n===M.ANCHOR_BOTH)&&i!==0));){if(i===0&&this.prog.numLb>0)for(let Y=0;Y<this.prog.lbStarts.length;Y++)this.add(a,this.prog.lbStarts[Y],i,this.matchcap,0,y);(i===0||n===M.UNANCHORED)&&i>=o&&this.add(a,this.prog.start,i,this.matchcap,0,y);const V=i+f;y=e.context(V);for(let Y=0;Y<a.size;Y++){const ee=a.densePcs[Y],se=this.prog.inst[ee],fe=Y*this.ncap;let oe=!1;switch(se.op){case k.MATCH:if(n===M.ANCHOR_BOTH&&i!==e.endPos())break;F.add(se.arg);break;case k.RUNE:oe=se.matchRune(B);break;case k.RUNE1:oe=B===se.runes[0];break;case k.RUNE_ANY:oe=!0;break;case k.RUNE_ANY_NOT_NL:oe=B!==10;break;default:continue}oe&&this.add(c,se.out,V,a.denseCaps,fe,y)}if(a.clear(),f===0)break;i+=f,B=p,f=m,B!==-1&&(l=e.step(i+f),p=l>>3,m=l&7);const j=a;a=c,c=j}return c.clear(),Array.from(F).sort((V,j)=>V-j)}step(e,t,n,s,i,o,a,c){const l=this.re2.longest;for(let B=0;B<e.size;B++){const f=e.densePcs[B],p=B*this.ncap;if(l&&this.matched&&this.ncap>0&&this.matchcap[0]<e.denseCaps[p])continue;const m=this.prog.inst[f];let y=!1;switch(m.op){case k.MATCH:if(a===M.ANCHOR_BOTH&&!c)break;if(this.ncap>0&&(!l||!this.matched||this.matchcap[1]<n)){e.denseCaps[p+1]=n;for(let F=0;F<this.ncap;F++)this.matchcap[F]=e.denseCaps[p+F]}l||(e.size=0),this.matched=!0;break;case k.RUNE:y=m.matchRune(i);break;case k.RUNE1:y=i===m.runes[0];break;case k.RUNE_ANY:y=!0;break;case k.RUNE_ANY_NOT_NL:y=i!==10;break;default:continue}y&&this.add(t,m.out,s,e.denseCaps,p,o)}e.clear()}add(e,t,n,s,i,o){for(;;){if(t===0||e.contains(t))return;const a=e.add(t),c=this.prog.inst[t];switch(c.op){case k.FAIL:return;case k.ALT:case k.ALT_MATCH:this.add(e,c.out,n,s,i,o),t=c.arg;continue;case k.EMPTY_WIDTH:if((c.arg&~o)===0){t=c.out;continue}return;case k.NOP:t=c.out;continue;case k.CAPTURE:if(c.arg<this.ncap){const l=s[i+c.arg];s[i+c.arg]=n,this.add(e,c.out,n,s,i,o),s[i+c.arg]=l;return}else{t=c.out;continue}case k.LB_WRITE:this.lbTable[Math.abs(c.arg)]=n,t=c.out;continue;case k.LB_CHECK:if(c.arg>0){if(this.lbTable[c.arg]===n){t=c.out;continue}}else if(this.lbTable[-c.arg]!==n){t=c.out;continue}return;case k.MATCH:case k.RUNE:case k.RUNE1:case k.RUNE_ANY:case k.RUNE_ANY_NOT_NL:if(this.ncap>0){const l=a*this.ncap;for(let B=0;B<this.ncap;B++)e.denseCaps[l+B]=s[i+B]}return;default:throw new lo("unhandled")}}}};const pp=r=>{let e=-2128831035;for(let t=0;t<r.length;t++)e^=r[t],e=Math.imul(e,16777619);return e},Cw=(r,e)=>{if(r.length!==e.length)return!1;for(let t=0;t<r.length;t++)if(r[t]!==e[t])return!1;return!0};var gw=class{constructor(r,e,t=[]){this.nfaStates=r,this.isMatch=e,this.matchIDs=t,this.nextLatin1=new Array($.MAX_LATIN1+1).fill(null),this.nextLatin1Anchored=new Array($.MAX_LATIN1+1).fill(null),this.transKeys=[],this.transVals=[],this.lastSeen=0}},mw=class rB{static MAX_CACHE_CLEARS=5;static STATE_MEMORY_ESTIMATE=838;constructor(e,t=8388608){this.prog=e,this.stateCache=new Map,this.stateCount=0,this.startState=null,this.stateLimit=Math.max(1,Math.floor(t/rB.STATE_MEMORY_ESTIMATE)),this.cacheClears=0,this.failed=!1,this.clock=0}computeClosure(e){const t=new Set,n=[...e];let s=!1;const i=[];for(;n.length>0;){const a=n.pop();if(t.has(a))continue;t.add(a);const c=this.prog.getInst(a);switch(c.op){case k.MATCH:s=!0,i.includes(c.arg)||i.push(c.arg);break;case k.ALT:case k.ALT_MATCH:n.push(c.out),n.push(c.arg);break;case k.NOP:case k.CAPTURE:n.push(c.out);break;case k.EMPTY_WIDTH:case k.LB_WRITE:case k.LB_CHECK:return null}}const o=Int32Array.from(t).sort();return i.sort((a,c)=>a-c),{pcs:o,isMatch:s,matchIDs:i}}getState(e){const t=this.computeClosure(e);if(!t)return null;const n=t.pcs,s=pp(n);let i=this.stateCache.get(s);if(i)for(let a=0;a<i.length;a++){const c=i[a];if(Cw(c.nfaStates,n))return c.lastSeen=++this.clock,c}else i=[],this.stateCache.set(s,i);if(this.failed)return null;if(this.stateCount>=this.stateLimit){if(this.cacheClears++,this.cacheClears>=rB.MAX_CACHE_CLEARS)return this.failed=!0,this.stateCache.clear(),this.stateCount=0,this.startState=null,null;this.evictCache(),i=this.stateCache.get(s),i||(i=[],this.stateCache.set(s,i))}const o=new gw(n,t.isMatch,t.matchIDs);return o.lastSeen=++this.clock,i.push(o),this.stateCount++,o}evictCache(){const e=[];for(const o of this.stateCache.values())for(let a=0;a<o.length;a++)e.push(o[a]);e.sort((o,a)=>o.lastSeen-a.lastSeen);const t=Math.max(1,Math.floor(this.stateLimit/2)),n=e.length-t,s=e.slice(n),i=new Set(s);this.stateCache.clear(),this.stateCount=0;for(let o=0;o<s.length;o++){const a=s[o];a.nextLatin1.fill(null),a.nextLatin1Anchored.fill(null),a.transKeys.length=0,a.transVals.length=0;const c=pp(a.nfaStates);let l=this.stateCache.get(c);l||(l=[],this.stateCache.set(c,l)),l.push(a),this.stateCount++}this.startState&&!i.has(this.startState)&&(this.startState=null)}step(e,t,n){if(t<=$.MAX_LATIN1)if(n===M.UNANCHORED){const o=e.nextLatin1[t];if(o!==null)return o}else{const o=e.nextLatin1Anchored[t];if(o!==null)return o}else{const o=t+(n===M.UNANCHORED?0:$.MAX_RUNE+1),a=e.transKeys,c=a.length;for(let l=0;l<c;l++)if(a[l]===o)return e.transVals[l]}const s=[];for(let o=0;o<e.nfaStates.length;o++){const a=e.nfaStates[o],c=this.prog.getInst(a);k.isRuneOp(c.op)&&c.matchRune(t)&&s.push(c.out)}n===M.UNANCHORED&&s.push(this.prog.start);const i=this.getState(s);if(t<=$.MAX_LATIN1)n===M.UNANCHORED?e.nextLatin1[t]=i:e.nextLatin1Anchored[t]=i;else{const o=t+(n===M.UNANCHORED?0:$.MAX_RUNE+1);e.transKeys.push(o),e.transVals.push(i)}return i}match(e,t,n){if((n===M.ANCHOR_START||n===M.ANCHOR_BOTH)&&t!==0)return!1;if(!this.startState&&(this.startState=this.getState([this.prog.start]),!this.startState))return null;let s=e.endPos(),i=this.startState;if(i.isMatch)if(n===M.ANCHOR_BOTH){if(t===s)return!0}else return!0;let o=t;for(;o<s;){const a=e.step(o),c=a>>3,l=a&7;if(l===0)break;if(i=n===M.UNANCHORED&&c<=$.MAX_LATIN1&&i.nextLatin1[c]||this.step(i,c,n),i===null)return null;if(i.lastSeen=++this.clock,i.isMatch)if(n===M.ANCHOR_BOTH){if(o+l===s)return!0}else return!0;if(i.nfaStates.length===0&&n!==M.UNANCHORED)return!1;o+=l}return!1}matchSet(e,t,n){if((n===M.ANCHOR_START||n===M.ANCHOR_BOTH)&&t!==0)return[];if(!this.startState&&(this.startState=this.getState([this.prog.start]),!this.startState))return null;let s=e.endPos(),i=this.startState;const o=new Set,a=(l,B)=>{l.isMatch&&(n===M.ANCHOR_BOTH?B===s&&l.matchIDs.forEach(f=>o.add(f)):l.matchIDs.forEach(f=>o.add(f)))};a(i,t);let c=t;for(;c<s;){const l=e.step(c),B=l>>3,f=l&7;if(f===0)break;if(i=n===M.UNANCHORED&&B<=$.MAX_LATIN1&&i.nextLatin1[B]||this.step(i,B,n),i===null)return null;if(i.lastSeen=++this.clock,c+=f,a(i,c),i.nfaStates.length===0&&n!==M.UNANCHORED)break}return Array.from(o).sort((l,B)=>l-B)}};const _w=32,Ew=500,yl=256,Iw=256*1024;var Dw=class{constructor(){this.end=0,this.cap=new Int32Array(0),this.matchcap=new Int32Array(0),this.ncap=0,this.jobPc=new Int32Array(yl),this.jobArg=new Uint8Array(yl),this.jobPos=new Int32Array(yl),this.jobLen=0,this.visited=new Uint32Array(0)}reset(r,e,t){this.end=e,this.jobLen=0,this.ncap=t;const n=r.numInst()*(e+1)+_w-1>>>5;this.visited.length<n?this.visited=new Uint32Array(n):this.visited.fill(0,0,n),this.cap.length<t?this.cap=new Int32Array(t).fill(-1):this.cap.fill(-1,0,t),this.matchcap.length<t?this.matchcap=new Int32Array(t).fill(-1):this.matchcap.fill(-1,0,t)}shouldVisit(r,e){const t=r*(this.end+1)+e,n=t>>>5,s=1<<(t&31);return(this.visited[n]&s)!==0?!1:(this.visited[n]|=s,!0)}push(r,e,t,n){if(r.prog.getInst(e).op!==k.FAIL&&(n||this.shouldVisit(e,t))){if(this.jobLen>=this.jobPc.length){const s=this.jobPc.length*2,i=new Int32Array(s);i.set(this.jobPc),this.jobPc=i;const o=new Uint8Array(s);o.set(this.jobArg),this.jobArg=o;const a=new Int32Array(s);a.set(this.jobPos),this.jobPos=a}this.jobPc[this.jobLen]=e,this.jobArg[this.jobLen]=n?1:0,this.jobPos[this.jobLen]=t,this.jobLen++}}tryBacktrack(r,e,t,n,s){const i=r.longest;for(this.push(r,t,n,!1);this.jobLen>0;){this.jobLen--;let o=this.jobPc[this.jobLen],a=this.jobArg[this.jobLen]===1,c=this.jobPos[this.jobLen],l=!0;for(;!(!l&&!this.shouldVisit(o,c));){l=!1;const B=r.prog.getInst(o);switch(B.op){case k.FAIL:throw new lo("unexpected InstFail");case k.ALT:if(a){a=!1,o=B.arg;continue}else{this.push(r,o,c,!0),o=B.out;continue}case k.ALT_MATCH:{const f=r.prog.getInst(B.out);if(k.isRuneOp(f.op)){this.push(r,B.arg,c,!1),o=B.arg,c=this.end;continue}this.push(r,B.out,this.end,!1),o=B.out;continue}case k.RUNE:{const f=e.step(c);if(f===ht.EOF()||!B.matchRune(f>>3))break;c+=f&7,o=B.out;continue}case k.RUNE1:{const f=e.step(c);if(f===ht.EOF()||f>>3!==B.runes[0])break;c+=f&7,o=B.out;continue}case k.RUNE_ANY_NOT_NL:{const f=e.step(c);if(f===ht.EOF()||f>>3===10)break;c+=f&7,o=B.out;continue}case k.RUNE_ANY:{const f=e.step(c);if(f===ht.EOF())break;c+=f&7,o=B.out;continue}case k.CAPTURE:if(a){this.cap[B.arg]=c;break}else{B.arg<this.ncap&&(this.push(r,o,this.cap[B.arg],!0),this.cap[B.arg]=c),o=B.out;continue}case k.EMPTY_WIDTH:{const f=e.context(c);if((B.arg&~f)!==0)break;o=B.out;continue}case k.NOP:o=B.out;continue;case k.MATCH:{if(s===M.ANCHOR_BOTH&&c!==this.end)break;if(this.ncap===0)return!0;this.ncap>1&&(this.cap[1]=c);const f=this.matchcap[1];if((f===-1||i&&c>0&&c>f)&&this.matchcap.set(this.cap),!i||c===this.end)return!0;break}case k.LB_WRITE:case k.LB_CHECK:throw new lo("Backtracker cannot evaluate Lookbehind instructions");default:throw new lo("bad inst")}break}}return i&&this.matchcap.length>1&&this.matchcap[1]>=0}};const Ga=[];var Ua=class Sm{static shouldBacktrack(e){return e.numInst()<=Ew}static maxBitStateLen(e){return Sm.shouldBacktrack(e)?Math.floor(Iw/e.numInst()):0}static execute(e,t,n,s,i){const o=e.cond;if(o===Z.EMPTY_ALL||(s===M.ANCHOR_START||s===M.ANCHOR_BOTH)&&n!==0||(o&Z.EMPTY_BEGIN_TEXT)!==0&&n!==0)return null;const a=Ga.length>0?Ga.pop():new Dw,c=t.endPos();a.reset(e.prog,c,i);let l=!1;if((o&Z.EMPTY_BEGIN_TEXT)!==0||s===M.ANCHOR_START||s===M.ANCHOR_BOTH)a.ncap>0&&(a.cap[0]=n),a.tryBacktrack(e,t,e.prog.start,n,s)&&(l=!0);else{let f=-1;for(;n<=c&&f!==0;n+=f){if(e.prefix.length>0){const m=t.index(e,n);if(m<0)break;n+=m}if(a.ncap>0&&(a.cap[0]=n),a.tryBacktrack(e,t,e.prog.start,n,s)){l=!0;break}const p=t.step(n);f=p===ht.EOF()?0:p&7}}if(!l)return Ga.push(a),null;const B=i===0?[]:Z.toArray(a.matchcap.subarray(0,i));return Ga.push(a),B}},Cp=class{constructor(r){this.sparse=new Uint32Array(r),this.dense=new Uint32Array(r),this.size=0,this.nextIndex=0}empty(){return this.nextIndex>=this.size}next(){return this.dense[this.nextIndex++]}clear(){this.size=0,this.nextIndex=0}contains(r){return r<this.sparse.length&&this.sparse[r]<this.size&&this.dense[this.sparse[r]]===r}insert(r){this.contains(r)||this.insertNew(r)}insertNew(r){r>=this.sparse.length||(this.sparse[r]=this.size,this.dense[this.size]=r,this.size++)}};const yw=(r,e,t,n)=>{const s=r.length,i=e.length;let o=0,a=0;const c=[],l=[];let B=!0,f=-1;const p=m=>{const y=m?r:e,F=m?o:a,V=m?t:n;return f>0&&y[F]<=c[f]?!1:(c.push(y[F],y[F+1]),m?o+=2:a+=2,f+=2,l.push(V),!0)};for(;o<s||a<i;)if(a>=i?B=p(!0):o>=s||e[a]<r[o]?B=p(!1):B=p(!0),!B)return null;return{merged:c,next:l}};var Tw=class{constructor(r){this.start=r.start,this.numCap=r.numCap,this.inst=new Array(r.inst.length);for(let e=0;e<r.inst.length;e++){const t=r.inst[e],n=new k(t.op);n.out=t.out,n.arg=t.arg,n.runes=t.runes?t.runes.slice():[],n.next=null,this.inst[e]=n}}};const ww=r=>{const e=new Tw(r);for(let t=0;t<e.inst.length;t++){const n=e.inst[t];if(n.op!==k.ALT&&n.op!==k.ALT_MATCH)continue;let s="out",i="arg",o=e.inst[n[i]];if(o.op!==k.ALT&&o.op!==k.ALT_MATCH&&(s="arg",i="out",o=e.inst[n[i]],o.op!==k.ALT&&o.op!==k.ALT_MATCH))continue;const a=e.inst[n[s]];if(a.op===k.ALT||a.op===k.ALT_MATCH)continue;let c="out",l="arg",B=!1;o.out===t?B=!0:o.arg===t&&(B=!0,c="arg",l="out"),B&&(o[c]=n[s]),n[s]===o[c]&&(n[i]=o[l])}return e},Aw=r=>{if(r.inst.length>=1e3)return null;const e=new Cp(r.inst.length),t=new Cp(r.inst.length),n=new Array(r.inst.length),s=new Array(r.inst.length).fill(!1),i=o=>{let a=!0;const c=r.inst[o];if(t.contains(o))return!0;switch(t.insert(o),c.op){case k.ALT:case k.ALT_MATCH:{a=i(c.out)&&i(c.arg);let l=s[c.out],B=s[c.arg];if(l&&B)return!1;if(B){const y=c.out;c.out=c.arg,c.arg=y;const F=l;l=B,B=F}l&&(s[o]=!0,c.op=k.ALT_MATCH);const f=n[c.out]||[],p=n[c.arg]||[],m=yw(f,p,c.out,c.arg);if(!m)return!1;n[o]=m.merged,c.next=new Uint32Array(m.next);break}case k.CAPTURE:case k.EMPTY_WIDTH:case k.NOP:a=i(c.out),s[o]=s[c.out],n[o]=n[c.out]?n[c.out].slice():[],c.next=new Uint32Array(Math.floor(n[o].length/2)+1).fill(c.out);break;case k.MATCH:case k.FAIL:s[o]=c.op===k.MATCH;break;case k.RUNE:{if(s[o]=!1,c.next&&c.next.length>0)break;if(e.insert(c.out),!c.runes||c.runes.length===0){n[o]=[],c.next=new Uint32Array([c.out]);break}let l=[];if(c.runes.length===1&&(c.arg&M.FOLD_CASE)!==0){const B=c.runes[0];l.push(B,B);for(let f=$.simpleFold(B);f!==B;f=$.simpleFold(f))l.push(f,f);l.sort((f,p)=>f-p)}else for(let B=0;B<c.runes.length;B++)l.push(c.runes[B]);n[o]=l,c.next=new Uint32Array(Math.floor(l.length/2)+1).fill(c.out),c.op=k.RUNE;break}case k.RUNE1:{if(s[o]=!1,c.next&&c.next.length>0)break;e.insert(c.out);let l=[];if((c.arg&M.FOLD_CASE)!==0){const B=c.runes[0];l.push(B,B);for(let f=$.simpleFold(B);f!==B;f=$.simpleFold(f))l.push(f,f);l.sort((f,p)=>f-p)}else l.push(c.runes[0],c.runes[0]);n[o]=l,c.next=new Uint32Array(Math.floor(l.length/2)+1).fill(c.out),c.op=k.RUNE;break}case k.RUNE_ANY:if(s[o]=!1,c.next&&c.next.length>0)break;e.insert(c.out),n[o]=[0,$.MAX_RUNE],c.next=new Uint32Array([c.out]);break;case k.RUNE_ANY_NOT_NL:if(s[o]=!1,c.next&&c.next.length>0)break;e.insert(c.out),n[o]=[0,9,11,$.MAX_RUNE],c.next=new Uint32Array(Math.floor(n[o].length/2)+1).fill(c.out);break}return a};for(e.clear(),e.insert(r.start);!e.empty();)if(t.clear(),!i(e.next()))return null;for(let o=0;o<r.inst.length;o++)n[o]&&(r.inst[o].runes=n[o]);return r},vw=(r,e)=>{for(let t=0;t<e.inst.length;t++){const n=e.inst[t];switch(n.op){case k.ALT:case k.ALT_MATCH:case k.RUNE:break;case k.CAPTURE:case k.EMPTY_WIDTH:case k.NOP:case k.MATCH:case k.FAIL:r.inst[t].next=null;break;case k.RUNE1:case k.RUNE_ANY:case k.RUNE_ANY_NOT_NL:r.inst[t].next=null,r.inst[t].op=n.op,r.inst[t].runes=n.runes?n.runes.slice():[];break}}};var gp=class Pm{static compile(e){if(e.start===0||e.numLb>0)return null;const t=e.inst[e.start];if(t.op!==k.EMPTY_WIDTH||(t.arg&Z.EMPTY_BEGIN_TEXT)===0)return null;let n=!1;for(let i=0;i<e.inst.length;i++)if(e.inst[i].op===k.ALT||e.inst[i].op===k.ALT_MATCH){n=!0;break}for(let i=0;i<e.inst.length;i++){const o=e.inst[i],a=e.inst[o.out].op;switch(o.op){case k.ALT:case k.ALT_MATCH:if(a===k.MATCH||e.inst[o.arg].op===k.MATCH)return null;break;case k.EMPTY_WIDTH:if(a===k.MATCH){if((o.arg&Z.EMPTY_END_TEXT)===Z.EMPTY_END_TEXT)continue;return null}break;default:if(a===k.MATCH&&n)return null;break}}let s=ww(e);return s=Aw(s),s!==null&&vw(s,e),s}static next(e,t){const n=e.matchRunePos(t);return n>=0?e.next[n]:e.op===k.ALT_MATCH?e.out:0}static execute(e,t,n,s,i){const o=e.onepass;if(!o)return null;const a=new Int32Array(i).fill(-1);let c=!1,l=t.step(n),B=l>>3,f=l&7,p=ht.EOF(),m=-1,y=0;l!==ht.EOF()&&(p=t.step(n+f),p!==ht.EOF()&&(m=p>>3,y=p&7));let F=n===0?Z.emptyOpContext(-1,B):t.context(n),V=o.start,j;for(;;){switch(j=o.inst[V],V=j.out,j.op){case k.MATCH:return s===M.ANCHOR_BOTH&&n!==t.endPos()?null:(c=!0,a.length>0&&(a[0]=0,a[1]=n),i===0?[]:Z.toArray(a));case k.RUNE:if(!j.matchRune(B))return null;break;case k.RUNE1:if(B!==j.runes[0])return null;break;case k.RUNE_ANY:break;case k.RUNE_ANY_NOT_NL:if(B===10)return null;break;case k.ALT:case k.ALT_MATCH:V=Pm.next(j,B);continue;case k.FAIL:return null;case k.NOP:continue;case k.EMPTY_WIDTH:if((j.arg&~F)!==0)return null;continue;case k.CAPTURE:j.arg<a.length&&(a[j.arg]=n);continue;default:throw new lo("bad inst")}if(f===0)break;F=Z.emptyOpContext(B,m),n+=f,B=m,f=y,B!==-1&&(p=t.step(n+f),p!==ht.EOF()?(m=p>>3,y=p&7):(m=-1,y=0))}return c?i===0?[]:Z.toArray(a):null}},A=class ne{static Op=Rm(["NO_MATCH","EMPTY_MATCH","LITERAL","CHAR_CLASS","ANY_CHAR_NOT_NL","ANY_CHAR","BEGIN_LINE","END_LINE","BEGIN_TEXT","END_TEXT","WORD_BOUNDARY","NO_WORD_BOUNDARY","CAPTURE","STAR","PLUS","QUEST","REPEAT","CONCAT","ALTERNATE","PLB","NLB","LEFT_PAREN","VERTICAL_BAR"]);static isPseudoOp(e){return e>=ne.Op.LEFT_PAREN}static emptySubs(){return[]}static quoteIfHyphen(e){return e===L.CODES.get("-")?"\\":""}static fromRegexp(e){const t=new ne(e.op);return t.flags=e.flags,t.subs=e.subs,t.runes=e.runes,t.cap=e.cap,t.min=e.min,t.max=e.max,t.name=e.name,t.namedGroups=e.namedGroups,t.lb=e.lb,t}constructor(e){this.op=e,this.flags=0,this.subs=ne.emptySubs(),this.runes=[],this.min=0,this.max=0,this.cap=0,this.name=null,this.namedGroups=Object.create(null),this.lb=0}reinit(){this.flags=0,this.subs=ne.emptySubs(),this.runes=[],this.cap=0,this.min=0,this.max=0,this.name=null,this.namedGroups=Object.create(null),this.lb=0}toString(){return this.appendTo()}appendTo(){let e="";switch(this.op){case ne.Op.NO_MATCH:e+="[^\\x00-\\x{10FFFF}]";break;case ne.Op.EMPTY_MATCH:e+="(?:)";break;case ne.Op.STAR:case ne.Op.PLUS:case ne.Op.QUEST:case ne.Op.REPEAT:{const t=this.subs[0];switch(t.op>ne.Op.CAPTURE||t.op===ne.Op.LITERAL&&t.runes.length>1?e+=`(?:${t.appendTo()})`:e+=t.appendTo(),this.op){case ne.Op.STAR:e+="*";break;case ne.Op.PLUS:e+="+";break;case ne.Op.QUEST:e+="?";break;case ne.Op.REPEAT:e+=`{${this.min}`,this.min!==this.max&&(e+=",",this.max>=0&&(e+=this.max)),e+="}";break}(this.flags&M.NON_GREEDY)!==0&&(e+="?");break}case ne.Op.CONCAT:for(let t of this.subs)t.op===ne.Op.ALTERNATE?e+=`(?:${t.appendTo()})`:e+=t.appendTo();break;case ne.Op.ALTERNATE:{let t="";for(let n of this.subs)e+=t,t="|",e+=n.appendTo();break}case ne.Op.LITERAL:(this.flags&M.FOLD_CASE)!==0&&(e+="(?i:");for(let t of this.runes)e+=Z.escapeRune(t);(this.flags&M.FOLD_CASE)!==0&&(e+=")");break;case ne.Op.ANY_CHAR_NOT_NL:e+="(?-s:.)";break;case ne.Op.ANY_CHAR:e+="(?s:.)";break;case ne.Op.PLB:e+=`(?<=${this.subs[0].appendTo()})`;break;case ne.Op.NLB:e+=`(?<!${this.subs[0].appendTo()})`;break;case ne.Op.CAPTURE:this.name===null||this.name.length===0?e+="(":e+=`(?P<${this.name}>`,this.subs[0].op!==ne.Op.EMPTY_MATCH&&(e+=this.subs[0].appendTo()),e+=")";break;case ne.Op.BEGIN_TEXT:e+="\\A";break;case ne.Op.END_TEXT:(this.flags&M.WAS_DOLLAR)!==0?e+="(?-m:$)":e+="\\z";break;case ne.Op.BEGIN_LINE:e+="^";break;case ne.Op.END_LINE:e+="$";break;case ne.Op.WORD_BOUNDARY:e+="\\b";break;case ne.Op.NO_WORD_BOUNDARY:e+="\\B";break;case ne.Op.CHAR_CLASS:if(this.runes.length%2!==0){e+="[invalid char class]";break}if(e+="[",this.runes.length===0)e+="^\\x00-\\x{10FFFF}";else if(this.runes[0]===0&&this.runes[this.runes.length-1]===$.MAX_RUNE){e+="^";for(let t=1;t<this.runes.length-1;t+=2){const n=this.runes[t]+1,s=this.runes[t+1]-1;e+=ne.quoteIfHyphen(n),e+=Z.escapeRune(n),n!==s&&(e+="-",e+=ne.quoteIfHyphen(s),e+=Z.escapeRune(s))}}else for(let t=0;t<this.runes.length;t+=2){const n=this.runes[t],s=this.runes[t+1];e+=ne.quoteIfHyphen(n),e+=Z.escapeRune(n),n!==s&&(e+="-",e+=ne.quoteIfHyphen(s),e+=Z.escapeRune(s))}e+="]";break;default:e+=this.op;break}return e}maxCap(){let e=0;if(this.op===ne.Op.CAPTURE&&(e=this.cap),this.subs!==null)for(let t of this.subs){const n=t.maxCap();e<n&&(e=n)}return e}equals(e){if(!(e!==null&&e instanceof ne)||this.op!==e.op)return!1;switch(this.op){case ne.Op.END_TEXT:if((this.flags&M.WAS_DOLLAR)!==(e.flags&M.WAS_DOLLAR))return!1;break;case ne.Op.LITERAL:case ne.Op.CHAR_CLASS:if(this.runes===null&&e.runes===null)break;if(this.runes===null||e.runes===null||this.runes.length!==e.runes.length)return!1;for(let t=0;t<this.runes.length;t++)if(this.runes[t]!==e.runes[t])return!1;break;case ne.Op.ALTERNATE:case ne.Op.CONCAT:if(this.subs.length!==e.subs.length)return!1;for(let t=0;t<this.subs.length;++t)if(!this.subs[t].equals(e.subs[t]))return!1;break;case ne.Op.STAR:case ne.Op.PLUS:case ne.Op.QUEST:if((this.flags&M.NON_GREEDY)!==(e.flags&M.NON_GREEDY)||!this.subs[0].equals(e.subs[0]))return!1;break;case ne.Op.REPEAT:if((this.flags&M.NON_GREEDY)!==(e.flags&M.NON_GREEDY)||this.min!==e.min||this.max!==e.max||!this.subs[0].equals(e.subs[0]))return!1;break;case ne.Op.CAPTURE:if(this.cap!==e.cap||(this.name===null?e.name!==null:this.name!==e.name)||!this.subs[0].equals(e.subs[0]))return!1;break;case ne.Op.PLB:case ne.Op.NLB:if(this.lb!==e.lb||!this.subs[0].equals(e.subs[0]))return!1;break}return!0}},mp=class{constructor(r){this.next=[Object.create(null)],this.fail=[0],this.match=[!1];for(const t of r){let n=0;for(let s=0;s<t.length;s++){const i=t[s];i in this.next[n]||(this.next.push(Object.create(null)),this.fail.push(0),this.match.push(!1),this.next[n][i]=this.next.length-1),n=this.next[n][i]}this.match[n]=!0}const e=[];for(const t in this.next[0])if(Object.prototype.hasOwnProperty.call(this.next[0],t)){const n=this.next[0][t];this.fail[n]=0,e.push(n)}for(;e.length>0;){const t=e.shift();for(const n in this.next[t])if(Object.prototype.hasOwnProperty.call(this.next[t],n)){const s=this.next[t][n];let i=this.fail[t];for(;i!==0&&!(n in this.next[i]);)i=this.fail[i];n in this.next[i]?this.fail[s]=this.next[i][n]:this.fail[s]=0,this.match[s]=this.match[s]||this.match[this.fail[s]],e.push(s)}}}searchUTF16(r,e,t){let n=0;for(let s=e;s<t;s++){const i=r.charCodeAt(s);for(;n!==0&&!(i in this.next[n]);)n=this.fail[n];if(i in this.next[n]&&(n=this.next[n][i]),this.match[n])return!0}return!1}searchUTF8(r,e,t){let n=0;for(let s=e;s<t;s++){const i=r[s];for(;n!==0&&!(i in this.next[n]);)n=this.fail[n];if(i in this.next[n]&&(n=this.next[n][i]),this.match[n])return!0}return!1}},Ce=class oo{static Type={NONE:0,EXACT:1,AND:2,OR:3};constructor(e){this.type=e,this.subs=[],this.str="",this.bytes=null,this.ac16=null,this.ac8=null}eval(e,t){switch(this.type){case oo.Type.NONE:return!0;case oo.Type.EXACT:return e.hasString(this,t);case oo.Type.AND:for(let n=0;n<this.subs.length;n++)if(!this.subs[n].eval(e,t))return!1;return!0;case oo.Type.OR:if(this.ac16&&this.ac8)return e.hasAnyString(this,t);for(let n=0;n<this.subs.length;n++)if(this.subs[n].eval(e,t))return!0;return!1;default:return!0}}},Rw=class In{static build(e){const t=In.fromRegexp(e);return In.simplify(t)}static fromRegexp(e){if(!e)return new Ce(Ce.Type.NONE);switch(e.op){case A.Op.PLB:case A.Op.NLB:case A.Op.NO_MATCH:case A.Op.EMPTY_MATCH:case A.Op.BEGIN_LINE:case A.Op.END_LINE:case A.Op.BEGIN_TEXT:case A.Op.END_TEXT:case A.Op.WORD_BOUNDARY:case A.Op.NO_WORD_BOUNDARY:case A.Op.CHAR_CLASS:case A.Op.ANY_CHAR_NOT_NL:case A.Op.ANY_CHAR:return new Ce(Ce.Type.NONE);case A.Op.LITERAL:{if(e.runes.length===0||(e.flags&M.FOLD_CASE)!==0)return new Ce(Ce.Type.NONE);const t=new Ce(Ce.Type.EXACT);let n="";for(let s=0;s<e.runes.length;s++)n+=String.fromCodePoint(e.runes[s]);return t.str=n,t.bytes=Z.stringToUtf8ByteArray(t.str),t}case A.Op.CAPTURE:case A.Op.PLUS:return In.fromRegexp(e.subs[0]);case A.Op.REPEAT:return e.min>=1?In.fromRegexp(e.subs[0]):new Ce(Ce.Type.NONE);case A.Op.CONCAT:{const t=new Ce(Ce.Type.AND);for(const n of e.subs)t.subs.push(In.fromRegexp(n));return t}case A.Op.ALTERNATE:{const t=new Ce(Ce.Type.OR);for(const n of e.subs)t.subs.push(In.fromRegexp(n));return t}default:return new Ce(Ce.Type.NONE)}}static simplify(e){if(e.type===Ce.Type.EXACT||e.type===Ce.Type.NONE)return e;if(e.type===Ce.Type.AND){const t=[];for(const n of e.subs){const s=In.simplify(n);if(s.type!==Ce.Type.NONE)if(s.type===Ce.Type.AND)for(let i=0;i<s.subs.length;i++)t.push(s.subs[i]);else t.push(s)}return t.length===0?new Ce(Ce.Type.NONE):t.length===1?t[0]:(e.subs=t,e)}if(e.type===Ce.Type.OR){const t=[];for(const o of e.subs){const a=In.simplify(o);if(a.type===Ce.Type.NONE)return new Ce(Ce.Type.NONE);if(a.type===Ce.Type.OR)for(let c=0;c<a.subs.length;c++)t.push(a.subs[c]);else t.push(a)}if(t.length===0)return new Ce(Ce.Type.NONE);if(t.length===1)return t[0];const n=new Set,s=[];for(const o of t)o.type===Ce.Type.EXACT?n.has(o.str)||(n.add(o.str),s.push(o)):s.push(o);e.subs=s;let i=!0;for(const o of s)if(o.type!==Ce.Type.EXACT){i=!1;break}return i&&s.length>1&&(e.ac16=new mp(s.map(o=>{const a=[];for(let c=0;c<o.str.length;c++)a.push(o.str.charCodeAt(c));return a})),e.ac8=new mp(s.map(o=>o.bytes))),e}return e}},Gt=class{constructor(r=0,e=0){this.head=r,this.tail=e}},bw=class{constructor(){this.inst=[],this.start=0,this.numCap=2,this.lbStarts=[],this.numLb=0}getInst(r){return this.inst[r]}numInst(){return this.inst.length}addInst(r){this.inst.push(new k(r))}skipNop(r){let e=this.inst[r];for(;e.op===k.NOP||e.op===k.CAPTURE;)e=this.inst[r],r=e.out;return e}prefix(){let r="",e=this.skipNop(this.start);if(!k.isRuneOp(e.op)||e.runes.length!==1)return[e.op===k.MATCH,r];for(;k.isRuneOp(e.op)&&e.runes.length===1&&(e.arg&M.FOLD_CASE)===0;)r+=String.fromCodePoint(e.runes[0]),e=this.skipNop(e.out);return[e.op===k.MATCH,r]}startCond(){let r=0,e=this.start;e:for(;;){const t=this.inst[e];switch(t.op){case k.EMPTY_WIDTH:r|=t.arg;break;case k.FAIL:return-1;case k.CAPTURE:case k.NOP:break;default:break e}e=t.out}return r}patch(r,e){let t=r.head;for(;t!==0;){const n=this.inst[t>>1];(t&1)===0?(t=n.out,n.out=e):(t=n.arg,n.arg=e)}}append(r,e){if(r.head===0)return e;if(e.head===0)return r;const t=this.inst[r.tail>>1];return(r.tail&1)===0?t.out=e.head:t.arg=e.head,new Gt(r.head,e.tail)}toString(){let r="";for(let e=0;e<this.inst.length;e++){const t=r.length;r+=e,e===this.start&&(r+="*"),r+="        ".substring(r.length-t),r+=this.inst[e],r+=`
`}return r}},Ha=class{constructor(r=0,e=new Gt,t=!1){this.i=r,this.out=e,this.nullable=t}},Sw=class xs{static ANY_RUNE_NOT_NL(){return[0,L.CODES.get(`
`)-1,L.CODES.get(`
`)+1,$.MAX_RUNE]}static ANY_RUNE(){return[0,$.MAX_RUNE]}static compileRegexp(e){const t=new xs,n=t.compile(e);return t.prog.patch(n.out,t.newInst(k.MATCH).i),t.prog.start=n.i,t.prog}static compileSet(e){const t=new xs;if(e.length===0)return t.prog.start=t.newInst(k.FAIL).i,t.prog;let n=[];for(let i=0;i<e.length;i++){const o=t.compile(e[i]),a=t.newInst(k.MATCH);t.prog.getInst(a.i).arg=i,t.prog.patch(o.out,a.i),n.push(o.i)}let s=n[0];for(let i=1;i<n.length;i++){const o=t.newInst(k.ALT),a=t.prog.getInst(o.i);a.out=s,a.arg=n[i],s=o.i}return t.prog.start=s,t.prog}constructor(){this.prog=new bw,this.newInst(k.FAIL)}newInst(e){return this.prog.addInst(e),new Ha(this.prog.numInst()-1,new Gt,!0)}nop(){const e=this.newInst(k.NOP);return e.out=new Gt(e.i<<1,e.i<<1),e}fail(){return new Ha}cap(e){const t=this.newInst(k.CAPTURE);return t.out=new Gt(t.i<<1,t.i<<1),this.prog.getInst(t.i).arg=e,this.prog.numCap<e+1&&(this.prog.numCap=e+1),t}cat(e,t){return e.i===0||t.i===0?this.fail():(this.prog.patch(e.out,t.i),new Ha(e.i,t.out,e.nullable&&t.nullable))}alt(e,t){if(e.i===0)return t;if(t.i===0)return e;const n=this.newInst(k.ALT),s=this.prog.getInst(n.i);return s.out=e.i,s.arg=t.i,n.out=this.prog.append(e.out,t.out),n.nullable=e.nullable||t.nullable,n}loop(e,t){const n=this.newInst(k.ALT),s=this.prog.getInst(n.i);return t?(s.arg=e.i,n.out=new Gt(n.i<<1,n.i<<1)):(s.out=e.i,n.out=new Gt(n.i<<1|1,n.i<<1|1)),this.prog.patch(e.out,n.i),n}quest(e,t){const n=this.newInst(k.ALT),s=this.prog.getInst(n.i);return t?(s.arg=e.i,n.out=new Gt(n.i<<1,n.i<<1)):(s.out=e.i,n.out=new Gt(n.i<<1|1,n.i<<1|1)),n.out=this.prog.append(n.out,e.out),n}star(e,t){return e.nullable?this.quest(this.plus(e,t),t):this.loop(e,t)}plus(e,t){return new Ha(e.i,this.loop(e,t).out,e.nullable)}empty(e){const t=this.newInst(k.EMPTY_WIDTH);return this.prog.getInst(t.i).arg=e,t.out=new Gt(t.i<<1,t.i<<1),t}rune(e,t){const n=this.newInst(k.RUNE);n.nullable=!1;const s=this.prog.getInst(n.i);return s.runes=e,t&=M.FOLD_CASE,(e.length!==1||$.simpleFold(e[0])===e[0])&&(t&=-2),s.arg=t,n.out=new Gt(n.i<<1,n.i<<1),(t&M.FOLD_CASE)===0&&e.length===1||e.length===2&&e[0]===e[1]?s.op=k.RUNE1:e.length===2&&e[0]===0&&e[1]===$.MAX_RUNE?s.op=k.RUNE_ANY:e.length===4&&e[0]===0&&e[1]===L.CODES.get(`
`)-1&&e[2]===L.CODES.get(`
`)+1&&e[3]===$.MAX_RUNE&&(s.op=k.RUNE_ANY_NOT_NL),n}lookBehind(e,t){const n=this.newInst(k.LB_WRITE);this.prog.getInst(n.i).arg=t;const s=this.rune(xs.ANY_RUNE(),0),i=this.star(s,!0),o=this.cat(i,e);this.prog.patch(o.out,n.i);const a=this.newInst(k.LB_CHECK);return this.prog.getInst(a.i).arg=t,this.prog.lbStarts.push(o.i),Math.abs(t)>this.prog.numLb&&(this.prog.numLb=Math.abs(t)),a.out=new Gt(a.i<<1,a.i<<1),a}compile(e){switch(e.op){case A.Op.NO_MATCH:return this.fail();case A.Op.EMPTY_MATCH:return this.nop();case A.Op.LITERAL:if(e.runes.length===0)return this.nop();{let t=null;for(let n of e.runes){const s=this.rune([n],e.flags);t=t===null?s:this.cat(t,s)}return t}case A.Op.CHAR_CLASS:return this.rune(e.runes,e.flags);case A.Op.ANY_CHAR_NOT_NL:return this.rune(xs.ANY_RUNE_NOT_NL(),0);case A.Op.ANY_CHAR:return this.rune(xs.ANY_RUNE(),0);case A.Op.BEGIN_LINE:return this.empty(Z.EMPTY_BEGIN_LINE);case A.Op.END_LINE:return this.empty(Z.EMPTY_END_LINE);case A.Op.BEGIN_TEXT:return this.empty(Z.EMPTY_BEGIN_TEXT);case A.Op.END_TEXT:return this.empty(Z.EMPTY_END_TEXT);case A.Op.WORD_BOUNDARY:return this.empty(Z.EMPTY_WORD_BOUNDARY);case A.Op.NO_WORD_BOUNDARY:return this.empty(Z.EMPTY_NO_WORD_BOUNDARY);case A.Op.PLB:case A.Op.NLB:return this.lookBehind(this.compile(e.subs[0]),e.lb);case A.Op.CAPTURE:{const t=this.cap(e.cap<<1),n=this.compile(e.subs[0]),s=this.cap(e.cap<<1|1);return this.cat(this.cat(t,n),s)}case A.Op.STAR:return this.star(this.compile(e.subs[0]),(e.flags&M.NON_GREEDY)!==0);case A.Op.PLUS:return this.plus(this.compile(e.subs[0]),(e.flags&M.NON_GREEDY)!==0);case A.Op.QUEST:return this.quest(this.compile(e.subs[0]),(e.flags&M.NON_GREEDY)!==0);case A.Op.CONCAT:if(e.subs.length===0)return this.nop();{let t=null;for(let n of e.subs){const s=this.compile(n);t=t===null?s:this.cat(t,s)}return t}case A.Op.ALTERNATE:if(e.subs.length===0)return this.nop();{let t=null;for(let n of e.subs){const s=this.compile(n);t=t===null?s:this.alt(t,s)}return t}default:throw new fw("regexp: unhandled case in compile")}}},Pw=class Rt{static simplify(e){if(e===null)return null;switch(e.op){case A.Op.PLB:case A.Op.NLB:case A.Op.CAPTURE:{const t=Rt.simplify(e.subs[0]);if(t!==e.subs[0]){const n=A.fromRegexp(e);return n.runes=[],n.subs=[t],n}return e}case A.Op.CONCAT:case A.Op.ALTERNATE:{const t=[];let n=!1;for(let s=0;s<e.subs.length;s++){const i=e.subs[s],o=Rt.simplify(i);if(o!==i&&(n=!0),e.op===A.Op.CONCAT){if(o.op===A.Op.NO_MATCH)return new A(A.Op.NO_MATCH);if(o.op===A.Op.EMPTY_MATCH){n=!0;continue}if(o.op===A.Op.CONCAT){n=!0;for(let a=0;a<o.subs.length;a++)t.push(o.subs[a]);continue}}else if(e.op===A.Op.ALTERNATE){if(o.op===A.Op.NO_MATCH){n=!0;continue}if(o.op===A.Op.ALTERNATE){n=!0;for(let a=0;a<o.subs.length;a++)t.push(o.subs[a]);continue}}t.push(o)}if(n){if(t.length===0)return new A(e.op===A.Op.CONCAT?A.Op.EMPTY_MATCH:A.Op.NO_MATCH);if(t.length===1)return t[0];const s=A.fromRegexp(e);return s.runes=[],s.subs=t,s}return e}case A.Op.CHAR_CLASS:return e.runes===null?e:e.runes.length===0?new A(A.Op.NO_MATCH):e.runes.length===2&&e.runes[0]===0&&e.runes[1]===$.MAX_RUNE?new A(A.Op.ANY_CHAR):e.runes.length===4&&e.runes[0]===0&&e.runes[1]===L.CODES.get(`
`)-1&&e.runes[2]===L.CODES.get(`
`)+1&&e.runes[3]===$.MAX_RUNE?new A(A.Op.ANY_CHAR_NOT_NL):e;case A.Op.STAR:case A.Op.PLUS:case A.Op.QUEST:{const t=Rt.simplify(e.subs[0]);return Rt.simplify1(e.op,e.flags,t,e)}case A.Op.REPEAT:{if(e.min===0&&e.max===0)return new A(A.Op.EMPTY_MATCH);const t=Rt.simplify(e.subs[0]);if(e.max===-1){if(e.min===0)return Rt.simplify1(A.Op.STAR,e.flags,t,null);if(e.min===1)return Rt.simplify1(A.Op.PLUS,e.flags,t,null);const s=new A(A.Op.CONCAT),i=[];for(let o=0;o<e.min-1;o++)i.push(t);return i.push(Rt.simplify1(A.Op.PLUS,e.flags,t,null)),s.subs=i.slice(0),Rt.simplify(s)}if(e.min===1&&e.max===1)return t;let n=null;if(e.min>0){n=[];for(let s=0;s<e.min;s++)n.push(t)}if(e.max>e.min){let s=Rt.simplify1(A.Op.QUEST,e.flags,t,null);for(let i=e.min+1;i<e.max;i++){const o=new A(A.Op.CONCAT);o.subs=[t,s],s=Rt.simplify1(A.Op.QUEST,e.flags,o,null)}if(n===null)return s;n.push(s)}if(n!==null){const s=new A(A.Op.CONCAT);return s.subs=n.slice(0),Rt.simplify(s)}return new A(A.Op.NO_MATCH)}}return e}static simplify1(e,t,n,s){if(n.op===A.Op.EMPTY_MATCH)return n;if(n.op===A.Op.NO_MATCH)return e===A.Op.PLUS?n:new A(A.Op.EMPTY_MATCH);if(e===n.op&&(t&M.NON_GREEDY)===(n.flags&M.NON_GREEDY))return n;if(s!==null&&s.op===e&&(s.flags&M.NON_GREEDY)===(t&M.NON_GREEDY)&&n===s.subs[0])return s;const i=new A(e);return i.flags=t,i.subs=[n],i}},pe=class{constructor(r,e){this.sign=r,this.cls=e}};const _p=[48,57],Ep=[9,10,12,13,32,32],Ip=[48,57,65,90,95,95,97,122],Dp=new Map([["\\d",new pe(1,_p)],["\\D",new pe(-1,_p)],["\\s",new pe(1,Ep)],["\\S",new pe(-1,Ep)],["\\w",new pe(1,Ip)],["\\W",new pe(-1,Ip)]]),yp=[48,57,65,90,97,122],Tp=[65,90,97,122],wp=[0,127],Ap=[9,9,32,32],vp=[0,31,127,127],Rp=[48,57],bp=[33,126],Sp=[97,122],Pp=[32,126],Np=[33,47,58,64,91,96,123,126],Op=[9,13,32,32],Fp=[65,90],Lp=[48,57,65,90,95,95,97,122],kp=[48,57,65,70,97,102],xp=new Map([["[:alnum:]",new pe(1,yp)],["[:^alnum:]",new pe(-1,yp)],["[:alpha:]",new pe(1,Tp)],["[:^alpha:]",new pe(-1,Tp)],["[:ascii:]",new pe(1,wp)],["[:^ascii:]",new pe(-1,wp)],["[:blank:]",new pe(1,Ap)],["[:^blank:]",new pe(-1,Ap)],["[:cntrl:]",new pe(1,vp)],["[:^cntrl:]",new pe(-1,vp)],["[:digit:]",new pe(1,Rp)],["[:^digit:]",new pe(-1,Rp)],["[:graph:]",new pe(1,bp)],["[:^graph:]",new pe(-1,bp)],["[:lower:]",new pe(1,Sp)],["[:^lower:]",new pe(-1,Sp)],["[:print:]",new pe(1,Pp)],["[:^print:]",new pe(-1,Pp)],["[:punct:]",new pe(1,Np)],["[:^punct:]",new pe(-1,Np)],["[:space:]",new pe(1,Op)],["[:^space:]",new pe(-1,Op)],["[:upper:]",new pe(1,Fp)],["[:^upper:]",new pe(-1,Fp)],["[:word:]",new pe(1,Lp)],["[:^word:]",new pe(-1,Lp)],["[:xdigit:]",new pe(1,kp)],["[:^xdigit:]",new pe(-1,kp)]]);var $n=class er{static charClassToString(e,t){let n="[";for(let s=0;s<t;s+=2){s>0&&(n+=" ");const i=e[s],o=e[s+1];i===o?n+=`0x${i.toString(16)}`:n+=`0x${i.toString(16)}-0x${o.toString(16)}`}return n+="]",n}static cmp(e,t,n,s){const i=e[t]-n;return i!==0?i:s-e[t+1]}static qsortIntPair(e,t,n){const s=((t+n)/2|0)&-2,i=e[s],o=e[s+1];let a=t,c=n;for(;a<=c;){for(;a<n&&er.cmp(e,a,i,o)<0;)a+=2;for(;c>t&&er.cmp(e,c,i,o)>0;)c-=2;if(a<=c){if(a!==c){let l=e[a];e[a]=e[c],e[c]=l,l=e[a+1],e[a+1]=e[c+1],e[c+1]=l}a+=2,c-=2}}t<c&&er.qsortIntPair(e,t,c),a<n&&er.qsortIntPair(e,a,n)}constructor(e=Z.emptyInts()){this.r=e,this.len=e.length}toArray(){return this.len===this.r.length?this.r:this.r.slice(0,this.len)}cleanClass(){if(this.len<4)return this;er.qsortIntPair(this.r,0,this.len-2);let e=2;for(let t=2;t<this.len;t+=2){const n=this.r[t],s=this.r[t+1];if(n<=this.r[e-1]+1){s>this.r[e-1]&&(this.r[e-1]=s);continue}this.r[e]=n,this.r[e+1]=s,e+=2}return this.len=e,this}appendLiteral(e,t){return(t&M.FOLD_CASE)!==0?this.appendFoldedRange(e,e):this.appendRange(e,e)}appendRange(e,t){if(this.len>0){for(let n=2;n<=4;n+=2)if(this.len>=n){const s=this.r[this.len-n],i=this.r[this.len-n+1];if(e<=i+1&&s<=t+1)return e<s&&(this.r[this.len-n]=e),t>i&&(this.r[this.len-n+1]=t),this}}return this.r[this.len++]=e,this.r[this.len++]=t,this}appendFoldedRange(e,t){if(e<=$.MIN_FOLD&&t>=$.MAX_FOLD)return this.appendRange(e,t);if(t<$.MIN_FOLD||e>$.MAX_FOLD)return this.appendRange(e,t);e<$.MIN_FOLD&&(this.appendRange(e,$.MIN_FOLD-1),e=$.MIN_FOLD),t>$.MAX_FOLD&&(this.appendRange($.MAX_FOLD+1,t),t=$.MAX_FOLD);for(let n=e;n<=t;n++){this.appendRange(n,n);for(let s=$.simpleFold(n);s!==n;s=$.simpleFold(s))this.appendRange(s,s)}return this}appendClass(e){for(let t=0;t<e.length;t+=2)this.appendRange(e[t],e[t+1]);return this}appendFoldedClass(e){for(let t=0;t<e.length;t+=2)this.appendFoldedRange(e[t],e[t+1]);return this}appendNegatedClass(e){let t=0;for(let n=0;n<e.length;n+=2){const s=e[n],i=e[n+1];t<=s-1&&this.appendRange(t,s-1),t=i+1}return t<=$.MAX_RUNE&&this.appendRange(t,$.MAX_RUNE),this}appendTable(e){for(let t=0;t<e.length;++t){const n=e.getLo(t),s=e.getHi(t),i=e.getStride(t);if(i===1){this.appendRange(n,s);continue}for(let o=n;o<=s;o+=i)this.appendRange(o,o)}return this}appendNegatedTable(e){let t=0;for(let n=0;n<e.length;++n){const s=e.getLo(n),i=e.getHi(n),o=e.getStride(n);if(o===1){t<=s-1&&this.appendRange(t,s-1),t=i+1;continue}for(let a=s;a<=i;a+=o)t<=a-1&&this.appendRange(t,a-1),t=a+1}return t<=$.MAX_RUNE&&this.appendRange(t,$.MAX_RUNE),this}appendTableWithSign(e,t){return t<0?this.appendNegatedTable(e):this.appendTable(e)}negateClass(){let e=0,t=0;for(let n=0;n<this.len;n+=2){const s=this.r[n],i=this.r[n+1];e<=s-1&&(this.r[t]=e,this.r[t+1]=s-1,t+=2),e=i+1}return this.len=t,e<=$.MAX_RUNE&&(this.r[this.len++]=e,this.r[this.len++]=$.MAX_RUNE),this}appendClassWithSign(e,t){return t<0?this.appendNegatedClass(e):this.appendClass(e)}appendGroup(e,t){let n=e.cls;return t&&(n=new er().appendFoldedClass(n).cleanClass().toArray()),this.appendClassWithSign(n,e.sign)}toString(){return er.charClassToString(this.r,this.len)}},Nw=class{constructor(r){this.str=r,this.position=0}pos(){return this.position}rewindTo(r){this.position=r}more(){return this.position<this.str.length}peek(){return this.str.codePointAt(this.position)}skip(r){this.position+=r}skipString(r){this.position+=r.length}pop(){const r=this.str.codePointAt(this.position);return this.position+=Z.charCount(r),r}lookingAt(r){return this.str.startsWith(r,this.position)}rest(){return this.str.substring(this.position)}from(r){return this.str.substring(r,this.position)}toString(){return this.rest()}},Ow=class W{static ERR_INTERNAL_ERROR="regexp/syntax: internal error";static ERR_INVALID_CHAR_RANGE="invalid character class range";static ERR_INVALID_ESCAPE="invalid escape sequence";static ERR_INVALID_NAMED_CAPTURE="invalid named capture";static ERR_INVALID_PERL_OP="invalid or unsupported Perl syntax";static ERR_INVALID_REPEAT_OP="invalid nested repetition operator";static ERR_INVALID_REPEAT_SIZE="invalid repeat count";static ERR_MISSING_BRACKET="missing closing ]";static ERR_MISSING_PAREN="missing closing )";static ERR_MISSING_REPEAT_ARGUMENT="missing argument to repetition operator";static ERR_TRAILING_BACKSLASH="trailing backslash at end of expression";static ERR_DUPLICATE_NAMED_CAPTURE="duplicate capture group name";static ERR_UNEXPECTED_PAREN="unexpected )";static ERR_NESTING_DEPTH="expression nests too deeply";static ERR_LARGE="expression too large";static ERR_INVALID_CAPTURE_IN_LOOKBEHIND="invalid capture in lookbehind";static MAX_HEIGHT=1e3;static MAX_SIZE=3355443;static MAX_RUNES=33554432;static ANY_TABLE=new g(new Uint32Array([0,$.MAX_RUNE,1]));static ASCII_TABLE=new g(new Uint32Array([0,127,1]));static ASCII_FOLD_TABLE=new g(new Uint32Array([0,127,1,383,383,1,8490,8490,1]));static unicodeTable(e){return e==="Any"?{tab:W.ANY_TABLE,fold:W.ANY_TABLE,sign:1}:e==="Ascii"?{tab:W.ASCII_TABLE,fold:W.ASCII_FOLD_TABLE,sign:1}:e==="Assigned"?{tab:gt.CATEGORIES.get("Cn"),fold:gt.CATEGORIES.get("Cn"),sign:-1}:e==="Lc"?{tab:gt.CATEGORIES.get("LC"),fold:gt.FOLD_CATEGORIES.get("LC"),sign:1}:gt.CATEGORIES.has(e)?{tab:gt.CATEGORIES.get(e),fold:gt.FOLD_CATEGORIES.get(e),sign:1}:gt.SCRIPTS.has(e)?{tab:gt.SCRIPTS.get(e),fold:gt.FOLD_SCRIPT.get(e),sign:1}:null}static minFoldRune(e){if(e<$.MIN_FOLD||e>$.MAX_FOLD)return e;let t=e;const n=e;for(e=$.simpleFold(e);e!==n;e=$.simpleFold(e))t>e&&(t=e);return t}static leadingRegexp(e){if(e.op===A.Op.EMPTY_MATCH)return null;if(e.op===A.Op.CONCAT&&e.subs.length>0){const t=e.subs[0];return t.op===A.Op.EMPTY_MATCH?null:t}return e}static literalRegexp(e,t){const n=new A(A.Op.LITERAL);return n.flags=t,n.runes=Z.stringToRunes(e),n}static parse(e,t){return new W(e,t).parseInternal()}static parseRepeat(e){const t=e.pos();if(!e.more()||!e.lookingAt("{"))return-1;e.skip(1);const n=W.parseInt(e);if(n===-1||!e.more())return-1;let s;if(!e.lookingAt(","))s=n;else{if(e.skip(1),!e.more())return-1;if(e.lookingAt("}"))s=-1;else if((s=W.parseInt(e))===-1)return-1}if(!e.more()||!e.lookingAt("}"))return-1;if(e.skip(1),n<0||n>1e3||s===-2||s>1e3||s>=0&&n>s)throw new De(W.ERR_INVALID_REPEAT_SIZE,e.from(t));return n<<16|s&$.MAX_BMP}static isValidCaptureName(e){if(e.length===0)return!1;for(let t=0;t<e.length;t++){const n=e.codePointAt(t);if(n!==L.CODES.get("_")&&!Z.isalnum(n))return!1}return!0}static parseInt(e){const t=e.pos();for(;e.more()&&e.peek()>=L.CODES.get("0")&&e.peek()<=L.CODES.get("9");)e.skip(1);const n=e.from(t);return n.length===0||n.length>1&&n.codePointAt(0)===L.CODES.get("0")?-1:n.length>8?-2:parseInt(n,10)}static isCharClass(e){return e.op===A.Op.LITERAL&&e.runes.length===1||e.op===A.Op.CHAR_CLASS||e.op===A.Op.ANY_CHAR_NOT_NL||e.op===A.Op.ANY_CHAR}static matchRune(e,t){switch(e.op){case A.Op.LITERAL:return e.runes.length===1&&e.runes[0]===t;case A.Op.CHAR_CLASS:for(let n=0;n<e.runes.length;n+=2)if(e.runes[n]<=t&&t<=e.runes[n+1])return!0;return!1;case A.Op.ANY_CHAR_NOT_NL:return t!==L.CODES.get(`
`);case A.Op.ANY_CHAR:return!0}return!1}static mergeCharClass(e,t){switch(e.op){case A.Op.ANY_CHAR:break;case A.Op.ANY_CHAR_NOT_NL:W.matchRune(t,L.CODES.get(`
`))&&(e.op=A.Op.ANY_CHAR);break;case A.Op.CHAR_CLASS:t.op===A.Op.LITERAL?e.runes=new $n(e.runes).appendLiteral(t.runes[0],t.flags).toArray():e.runes=new $n(e.runes).appendClass(t.runes).toArray();break;case A.Op.LITERAL:if(t.runes[0]===e.runes[0]&&t.flags===e.flags)break;e.op=A.Op.CHAR_CLASS,e.runes=new $n().appendLiteral(e.runes[0],e.flags).appendLiteral(t.runes[0],t.flags).toArray();break}}static parseEscape(e){const t=e.pos();if(e.skip(1),!e.more())throw new De(W.ERR_TRAILING_BACKSLASH);let n=e.pop();e:switch(n){case L.CODES.get("1"):case L.CODES.get("2"):case L.CODES.get("3"):case L.CODES.get("4"):case L.CODES.get("5"):case L.CODES.get("6"):case L.CODES.get("7"):if(!e.more()||e.peek()<L.CODES.get("0")||e.peek()>L.CODES.get("7"))break;case L.CODES.get("0"):{let s=n-L.CODES.get("0");for(let i=1;i<3&&!(!e.more()||e.peek()<L.CODES.get("0")||e.peek()>L.CODES.get("7"));i++)s=s*8+e.peek()-L.CODES.get("0"),e.skip(1);return s}case L.CODES.get("x"):{if(!e.more())break;if(n=e.pop(),n===L.CODES.get("{")){let o=0,a=0;for(;;){if(!e.more())break e;if(n=e.pop(),n===L.CODES.get("}"))break;const c=Z.unhex(n);if(c<0||(a=a*16+c,a>$.MAX_RUNE))break e;o++}if(o===0)break e;return a}const s=Z.unhex(n);if(!e.more())break;n=e.pop();const i=Z.unhex(n);if(s<0||i<0)break;return s*16+i}case L.CODES.get("a"):return L.CODES.get("\x07");case L.CODES.get("f"):return L.CODES.get("\f");case L.CODES.get("n"):return L.CODES.get(`
`);case L.CODES.get("r"):return L.CODES.get("\r");case L.CODES.get("t"):return L.CODES.get("	");case L.CODES.get("v"):return L.CODES.get("\v");default:if(n<=$.MAX_ASCII&&!Z.isalnum(n))return n;break}throw new De(W.ERR_INVALID_ESCAPE,e.from(t))}static parseClassChar(e,t){if(!e.more())throw new De(W.ERR_MISSING_BRACKET,e.from(t));return e.lookingAt("\\")?W.parseEscape(e):e.pop()}static concatRunes(e,t){for(let n=0;n<t.length;n++)e.push(t[n]);return e}static hasCapture(e){if(e===null)return!1;if(e.op===A.Op.CAPTURE)return!0;if(e.subs){for(let t of e.subs)if(W.hasCapture(t))return!0}return!1}constructor(e,t=0){this.wholeRegexp=e,this.flags=t,this.numCap=0,this.namedGroups=Object.create(null),this.stack=[],this.free=null,this.numRegexp=0,this.numRunes=0,this.repeats=0,this.height=null,this.size=null,this.nlb=0}newRegexp(e){let t=this.free;return t!==null&&t.subs!==null&&t.subs.length>0?(this.free=t.subs[0],t.reinit(),t.op=e):(t=new A(e),this.numRegexp+=1),t}reuse(e){this.height!==null&&this.height.has(e)&&this.height.delete(e),e.subs!==null&&e.subs.length>0&&(e.subs[0]=this.free),this.free=e}checkLimits(e){if(this.numRunes>W.MAX_RUNES)throw new De(W.ERR_LARGE);this.checkSize(e),this.checkHeight(e)}checkSize(e){if(this.size===null){if(this.repeats===0&&(this.repeats=1),e.op===A.Op.REPEAT){let t=e.max;t===-1&&(t=e.min),t<=0&&(t=1),t>Math.floor(W.MAX_SIZE/this.repeats)?this.repeats=W.MAX_SIZE:this.repeats*=t}if(this.numRegexp<Math.floor(W.MAX_SIZE/this.repeats))return;this.size=new Map;for(let t of this.stack)this.checkSize(t)}if(this.calcSize(e,!0)>W.MAX_SIZE)throw new De(W.ERR_LARGE)}calcSize(e,t=!1){if(!t&&this.size!==null&&this.size.has(e))return this.size.get(e);let n=0;switch(e.op){case A.Op.LITERAL:n=e.runes.length;break;case A.Op.PLB:case A.Op.NLB:case A.Op.CAPTURE:case A.Op.STAR:n=2+this.calcSize(e.subs[0]);break;case A.Op.PLUS:case A.Op.QUEST:n=1+this.calcSize(e.subs[0]);break;case A.Op.CONCAT:for(let s of e.subs)n=n+this.calcSize(s);break;case A.Op.ALTERNATE:for(let s of e.subs)n=n+this.calcSize(s);e.subs.length>1&&(n=n+e.subs.length-1);break;case A.Op.REPEAT:{let s=this.calcSize(e.subs[0]);if(e.max===-1){e.min===0?n=2+s:n=1+e.min*s;break}n=e.max*s+(e.max-e.min);break}}return n=Math.max(1,n),this.size===null&&(this.size=new Map),this.size.set(e,n),n}checkHeight(e){if(!(this.numRegexp<W.MAX_HEIGHT)){if(this.height===null){this.height=new Map;for(let t of this.stack)this.checkHeight(t)}if(this.calcHeight(e,!0)>W.MAX_HEIGHT)throw new De(W.ERR_NESTING_DEPTH)}}calcHeight(e,t=!1){if(!t&&this.height!==null&&this.height.has(e))return this.height.get(e);let n=1;for(let s of e.subs){const i=this.calcHeight(s);n<1+i&&(n=1+i)}return this.height===null&&(this.height=new Map),this.height.set(e,n),n}pop(){return this.stack.pop()}popToPseudo(){const e=this.stack.length;let t=e;for(;t>0&&!A.isPseudoOp(this.stack[t-1].op);)t--;const n=this.stack.slice(t,e);return this.stack=this.stack.slice(0,t),n}push(e){if(this.numRunes+=e.runes.length,e.op===A.Op.CHAR_CLASS&&e.runes.length===2&&e.runes[0]===e.runes[1]){if(this.maybeConcat(e.runes[0],this.flags&-2))return null;e.op=A.Op.LITERAL,e.runes=[e.runes[0]],e.flags=this.flags&-2}else if(e.op===A.Op.CHAR_CLASS&&e.runes.length===4&&e.runes[0]===e.runes[1]&&e.runes[2]===e.runes[3]&&$.simpleFold(e.runes[0])===e.runes[2]&&$.simpleFold(e.runes[2])===e.runes[0]||e.op===A.Op.CHAR_CLASS&&e.runes.length===2&&e.runes[0]+1===e.runes[1]&&$.simpleFold(e.runes[0])===e.runes[1]&&$.simpleFold(e.runes[1])===e.runes[0]){if(this.maybeConcat(e.runes[0],this.flags|M.FOLD_CASE))return null;e.op=A.Op.LITERAL,e.runes=[e.runes[0]],e.flags=this.flags|M.FOLD_CASE}else this.maybeConcat(-1,0);return this.stack.push(e),this.checkLimits(e),e}maybeConcat(e,t){const n=this.stack.length;if(n<2)return!1;const s=this.stack[n-1],i=this.stack[n-2];return s.op!==A.Op.LITERAL||i.op!==A.Op.LITERAL||(s.flags&M.FOLD_CASE)!==(i.flags&M.FOLD_CASE)?!1:(i.runes=W.concatRunes(i.runes,s.runes),e>=0?(s.runes=[e],s.flags=t,!0):(this.pop(),this.reuse(s),!1))}newLiteral(e,t){const n=this.newRegexp(A.Op.LITERAL);return n.flags=t,(t&M.FOLD_CASE)!==0&&(e=W.minFoldRune(e)),n.runes=[e],n}literal(e){this.push(this.newLiteral(e,this.flags))}op(e){const t=this.newRegexp(e);return t.flags=this.flags,this.push(t)}repeat(e,t,n,s,i,o){let a=this.flags;if((a&M.PERL_X)!==0&&(i.more()&&i.lookingAt("?")&&(i.skip(1),a^=M.NON_GREEDY),o!==-1))throw new De(W.ERR_INVALID_REPEAT_OP,i.from(o));const c=this.stack.length;if(c===0)throw new De(W.ERR_MISSING_REPEAT_ARGUMENT,i.from(s));const l=this.stack[c-1];if(A.isPseudoOp(l.op))throw new De(W.ERR_MISSING_REPEAT_ARGUMENT,i.from(s));const B=this.newRegexp(e);if(B.min=t,B.max=n,B.flags=a,B.subs=[l],this.stack[c-1]=B,this.checkLimits(B),e===A.Op.REPEAT&&(t>=2||n>=2)&&!this.repeatIsValid(B,1e3))throw new De(W.ERR_INVALID_REPEAT_SIZE,i.from(s))}repeatIsValid(e,t){if(e.op===A.Op.REPEAT){let n=e.max;if(n===0)return!0;if(n<0&&(n=e.min),n>t)return!1;n>0&&(t=Math.trunc(t/n))}for(let n of e.subs)if(!this.repeatIsValid(n,t))return!1;return!0}concat(){this.maybeConcat(-1,0);const e=this.popToPseudo();return e.length===0?this.push(this.newRegexp(A.Op.EMPTY_MATCH)):this.push(this.collapse(e,A.Op.CONCAT))}alternate(){const e=this.popToPseudo();return e.length>0&&this.cleanAlt(e[e.length-1]),e.length===0?this.push(this.newRegexp(A.Op.NO_MATCH)):this.push(this.collapse(e,A.Op.ALTERNATE))}cleanAlt(e){e.op===A.Op.CHAR_CLASS&&(e.runes=new $n(e.runes).cleanClass().toArray(),e.runes.length===2&&e.runes[0]===0&&e.runes[1]===$.MAX_RUNE?(e.runes=[],e.op=A.Op.ANY_CHAR):e.runes.length===4&&e.runes[0]===0&&e.runes[1]===L.CODES.get(`
`)-1&&e.runes[2]===L.CODES.get(`
`)+1&&e.runes[3]===$.MAX_RUNE&&(e.runes=[],e.op=A.Op.ANY_CHAR_NOT_NL))}collapse(e,t){if(e.length===1)return e[0];let n=0;for(let a of e)n+=a.op===t?a.subs.length:1;let s=new Array(n).fill(null),i=0;for(let a of e)if(a.op===t){for(let c=0;c<a.subs.length;c++)s[i++]=a.subs[c];this.reuse(a)}else s[i++]=a;let o=this.newRegexp(t);if(o.subs=s,t===A.Op.ALTERNATE&&(o.subs=this.factor(o.subs),o.subs.length===1)){const a=o;o=o.subs[0],this.reuse(a)}return o}factor(e){if(e.length<2)return e;let t=0,n=e.length,s=0,i=null,o=0,a=0,c=0;for(let B=0;B<=n;B++){let f=null,p=0,m=0;if(B<n){let y=e[t+B];if(y.op===A.Op.CONCAT&&y.subs.length>0&&(y=y.subs[0]),y.op===A.Op.LITERAL&&(f=y.runes,p=y.runes.length,m=y.flags&M.FOLD_CASE),m===a){let F=0;for(;F<o&&F<p&&i[F]===f[F];)F++;if(F>0){o=F;continue}}}if(B!==c)if(B===c+1)e[s++]=e[t+c];else{const y=this.newRegexp(A.Op.LITERAL);y.flags=a,y.runes=i.slice(0,o);for(let j=c;j<B;j++)e[t+j]=this.removeLeadingString(e[t+j],o),this.checkLimits(e[t+j]);const F=this.collapse(e.slice(t+c,t+B),A.Op.ALTERNATE),V=this.newRegexp(A.Op.CONCAT);V.subs=[y,F],e[s++]=V}c=B,i=f,o=p,a=m}n=s,t=0,c=0,s=0;let l=null;for(let B=0;B<=n;B++){let f=null;if(!(B<n&&(f=W.leadingRegexp(e[t+B]),l!==null&&l.equals(f)&&(W.isCharClass(l)||l.op===A.Op.REPEAT&&l.min===l.max&&W.isCharClass(l.subs[0]))))){if(B!==c)if(B===c+1)e[s++]=e[t+c];else{const p=l;for(let F=c;F<B;F++){const V=F!==c;e[t+F]=this.removeLeadingRegexp(e[t+F],V),this.checkLimits(e[t+F])}const m=this.collapse(e.slice(t+c,t+B),A.Op.ALTERNATE),y=this.newRegexp(A.Op.CONCAT);y.subs=[p,m],e[s++]=y}c=B,l=f}}n=s,t=0,c=0,s=0;for(let B=0;B<=n;B++)if(!(B<n&&W.isCharClass(e[t+B]))){if(B!==c)if(B===c+1)e[s++]=e[t+c];else{let f=c;for(let m=c+1;m<B;m++){const y=e[t+f],F=e[t+m];(y.op<F.op||y.op===F.op&&(y.runes!==null?y.runes.length:0)<(F.runes!==null?F.runes.length:0))&&(f=m)}const p=e[t+c];e[t+c]=e[t+f],e[t+f]=p;for(let m=c+1;m<B;m++)W.mergeCharClass(e[t+c],e[t+m]),this.reuse(e[t+m]);this.cleanAlt(e[t+c]),e[s++]=e[t+c]}B<n&&(e[s++]=e[t+B]),c=B+1}n=s,t=0,c=0,s=0;for(let B=0;B<n;++B)B+1<n&&e[t+B].op===A.Op.EMPTY_MATCH&&e[t+B+1].op===A.Op.EMPTY_MATCH||(e[s++]=e[t+B]);return n=s,t=0,e.slice(t,n)}removeLeadingString(e,t){if(e.op===A.Op.CONCAT&&e.subs.length>0){const n=this.removeLeadingString(e.subs[0],t);if(e.subs[0]=n,n.op===A.Op.EMPTY_MATCH)switch(this.reuse(n),e.subs.length){case 0:case 1:e.op=A.Op.EMPTY_MATCH,e.subs=A.emptySubs();break;case 2:{const s=e;e=e.subs[1],this.reuse(s);break}default:e.subs=e.subs.slice(1,e.subs.length);break}return e}return e.op===A.Op.LITERAL&&(e.runes=e.runes.slice(t,e.runes.length),e.runes.length===0&&(e.op=A.Op.EMPTY_MATCH)),e}removeLeadingRegexp(e,t){if(e.op===A.Op.CONCAT&&e.subs.length>0){switch(t&&this.reuse(e.subs[0]),e.subs=e.subs.slice(1,e.subs.length),e.subs.length){case 0:e.op=A.Op.EMPTY_MATCH,e.subs=A.emptySubs();break;case 1:{const n=e;e=e.subs[0],this.reuse(n);break}}return e}return t&&this.reuse(e),this.newRegexp(A.Op.EMPTY_MATCH)}parseInternal(){if((this.flags&M.LITERAL)!==0)return W.literalRegexp(this.wholeRegexp,this.flags);let e=-1,t=-1,n=-1;const s=new Nw(this.wholeRegexp);for(;s.more();){let i=-1;e:switch(s.peek()){case L.CODES.get("("):if((this.flags&M.LOOKBEHIND)!==0){if(s.lookingAt("(?<=")){this.parsePosLookBehind(),s.skip(4);break}if(s.lookingAt("(?<!")){this.parseNegLookBehind(),s.skip(4);break}}if((this.flags&M.PERL_X)!==0&&s.lookingAt("(?")){this.parsePerlFlags(s);break}this.op(A.Op.LEFT_PAREN).cap=++this.numCap,s.skip(1);break;case L.CODES.get("|"):this.parseVerticalBar(),s.skip(1);break;case L.CODES.get(")"):this.parseRightParen(),s.skip(1);break;case L.CODES.get("^"):(this.flags&M.ONE_LINE)!==0?this.op(A.Op.BEGIN_TEXT):this.op(A.Op.BEGIN_LINE),s.skip(1);break;case L.CODES.get("$"):(this.flags&M.ONE_LINE)!==0?this.op(A.Op.END_TEXT).flags|=M.WAS_DOLLAR:this.op(A.Op.END_LINE),s.skip(1);break;case L.CODES.get("."):(this.flags&M.DOT_NL)!==0?this.op(A.Op.ANY_CHAR):this.op(A.Op.ANY_CHAR_NOT_NL),s.skip(1);break;case L.CODES.get("["):this.parseClass(s);break;case L.CODES.get("*"):case L.CODES.get("+"):case L.CODES.get("?"):{i=s.pos();let o=null;switch(s.pop()){case L.CODES.get("*"):o=A.Op.STAR;break;case L.CODES.get("+"):o=A.Op.PLUS;break;case L.CODES.get("?"):o=A.Op.QUEST;break}this.repeat(o,t,n,i,s,e);break}case L.CODES.get("{"):{i=s.pos();const o=W.parseRepeat(s);if(o<0){s.rewindTo(i),this.literal(s.pop());break}t=o>>16,n=(o&$.MAX_BMP)<<16>>16,this.repeat(A.Op.REPEAT,t,n,i,s,e);break}case L.CODES.get("\\"):{const o=s.pos();if(s.skip(1),(this.flags&M.PERL_X)!==0&&s.more())switch(s.pop()){case L.CODES.get("A"):this.op(A.Op.BEGIN_TEXT);break e;case L.CODES.get("b"):this.op(A.Op.WORD_BOUNDARY);break e;case L.CODES.get("B"):this.op(A.Op.NO_WORD_BOUNDARY);break e;case L.CODES.get("C"):throw new De(W.ERR_INVALID_ESCAPE,"\\C");case L.CODES.get("Q"):{let l=s.rest();const B=l.indexOf("\\E");B>=0?(l=l.substring(0,B),s.skipString(l),s.skipString("\\E")):s.skipString(l);let f=0;for(;f<l.length;){const p=l.codePointAt(f);this.literal(p),f+=Z.charCount(p)}break e}case L.CODES.get("z"):this.op(A.Op.END_TEXT);break e;default:s.rewindTo(o);break}else s.rewindTo(o);const a=this.newRegexp(A.Op.CHAR_CLASS);if(a.flags=this.flags,s.lookingAt("\\p")||s.lookingAt("\\P")){const l=new $n;if(this.parseUnicodeClass(s,l)){a.runes=l.toArray(),this.push(a);break e}}const c=new $n;if(this.parsePerlClassEscape(s,c)){a.runes=c.toArray(),this.push(a);break e}s.rewindTo(o),this.reuse(a),this.literal(W.parseEscape(s));break}default:this.literal(s.pop());break}e=i}if(this.concat(),this.swapVerticalBar()&&this.pop(),this.alternate(),this.stack.length!==1)throw new De(W.ERR_MISSING_PAREN,this.wholeRegexp);return this.stack[0].namedGroups=this.namedGroups,this.stack[0]}parsePerlFlags(e){const t=e.pos(),n=e.rest();if(n.startsWith("(?P<")||n.startsWith("(?<")){const a=n.charAt(2)==="P"?4:3,c=n.indexOf(">");if(c<0)throw new De(W.ERR_INVALID_NAMED_CAPTURE,n);const l=n.substring(a,c);if(e.skipString(l),e.skip(a+1),!W.isValidCaptureName(l))throw new De(W.ERR_INVALID_NAMED_CAPTURE,n.substring(0,c+1));const B=this.op(A.Op.LEFT_PAREN);if(B.cap=++this.numCap,this.namedGroups[l])throw new De(W.ERR_DUPLICATE_NAMED_CAPTURE,l);this.namedGroups[l]=this.numCap,B.name=l;return}e.skip(2);let s=this.flags,i=1,o=!1;e:for(;e.more();){const a=e.pop();switch(a){case L.CODES.get("i"):s|=M.FOLD_CASE,o=!0;break;case L.CODES.get("m"):s&=-17,o=!0;break;case L.CODES.get("s"):s|=M.DOT_NL,o=!0;break;case L.CODES.get("U"):s|=M.NON_GREEDY,o=!0;break;case L.CODES.get("-"):if(i<0)break e;i=-1,s=~s,o=!1;break;case L.CODES.get(":"):case L.CODES.get(")"):if(i<0){if(!o)break e;s=~s}a===L.CODES.get(":")&&this.op(A.Op.LEFT_PAREN),this.flags=s;return;default:break e}}throw new De(W.ERR_INVALID_PERL_OP,e.from(t))}parsePosLookBehind(){const e=this.newRegexp(A.Op.LEFT_PAREN);return e.flags=this.flags,e.lb=++this.nlb,this.push(e)}parseNegLookBehind(){const e=this.newRegexp(A.Op.LEFT_PAREN);return e.flags=this.flags,e.lb=-++this.nlb,this.push(e)}parseVerticalBar(){this.concat(),this.swapVerticalBar()||this.op(A.Op.VERTICAL_BAR)}swapVerticalBar(){const e=this.stack.length;if(e>=3&&this.stack[e-2].op===A.Op.VERTICAL_BAR&&W.isCharClass(this.stack[e-1])&&W.isCharClass(this.stack[e-3])){let t=this.stack[e-1],n=this.stack[e-3];if(t.op>n.op){const s=n;n=t,t=s,this.stack[e-3]=n}return W.mergeCharClass(n,t),this.reuse(t),this.pop(),!0}if(e>=2){const t=this.stack[e-1],n=this.stack[e-2];if(n.op===A.Op.VERTICAL_BAR)return e>=3&&this.cleanAlt(this.stack[e-3]),this.stack[e-2]=t,this.stack[e-1]=n,!0}return!1}parseRightParen(){if(this.concat(),this.swapVerticalBar()&&this.pop(),this.alternate(),this.stack.length<2)throw new De(W.ERR_UNEXPECTED_PAREN,this.wholeRegexp);const e=this.pop(),t=this.pop();if(t.op!==A.Op.LEFT_PAREN)throw new De(W.ERR_UNEXPECTED_PAREN,this.wholeRegexp);if(this.flags=t.flags,t.lb!==0){if(W.hasCapture(e))throw new De(W.ERR_INVALID_CAPTURE_IN_LOOKBEHIND,this.wholeRegexp);t.lb>0?t.op=A.Op.PLB:t.op=A.Op.NLB,t.subs=[e],this.push(t);return}t.cap===0?this.push(e):(t.op=A.Op.CAPTURE,t.subs=[e],this.push(t))}parsePerlClassEscape(e,t){const n=e.pos();if((this.flags&M.PERL_X)===0||!e.more()||e.pop()!==L.CODES.get("\\")||!e.more())return!1;e.pop();const s=e.from(n),i=Dp.has(s)?Dp.get(s):null;return i===null?!1:(t.appendGroup(i,(this.flags&M.FOLD_CASE)!==0),!0)}parseNamedClass(e,t){const n=e.rest(),s=n.indexOf(":]");if(s<0)return!1;const i=n.substring(0,s+2);e.skipString(i);const o=xp.has(i)?xp.get(i):null;if(o===null)throw new De(W.ERR_INVALID_CHAR_RANGE,i);return t.appendGroup(o,(this.flags&M.FOLD_CASE)!==0),!0}parseUnicodeClass(e,t){const n=e.pos();if((this.flags&M.UNICODE_GROUPS)===0||!e.lookingAt("\\p")&&!e.lookingAt("\\P"))return!1;e.skip(1);let s=1,i=e.pop();if(i===L.CODES.get("P")&&(s=-1),!e.more())throw e.rewindTo(n),new De(W.ERR_INVALID_CHAR_RANGE,e.rest());i=e.pop();let o;if(i!==L.CODES.get("{"))o=Z.runeToString(i);else{const B=e.rest(),f=B.indexOf("}");if(f<0)throw e.rewindTo(n),new De(W.ERR_INVALID_CHAR_RANGE,e.rest());o=B.substring(0,f),e.skipString(o),e.skip(1)}o.length!==0&&o.codePointAt(0)===L.CODES.get("^")&&(s=0-s,o=o.substring(1));const a=W.unicodeTable(o);if(a===null)throw new De(W.ERR_INVALID_CHAR_RANGE,e.from(n));a.sign<0&&(s=0-s);const c=a.tab,l=a.fold;if((this.flags&M.FOLD_CASE)===0||l===null)t.appendTableWithSign(c,s);else{const B=new $n().appendTable(c).appendTable(l).cleanClass().toArray();t.appendClassWithSign(B,s)}return!0}parseClass(e){const t=e.pos();e.skip(1);const n=this.newRegexp(A.Op.CHAR_CLASS);n.flags=this.flags;const s=new $n;let i=1;e.more()&&e.lookingAt("^")&&(i=-1,e.skip(1),(this.flags&M.CLASS_NL)===0&&s.appendRange(L.CODES.get(`
`),L.CODES.get(`
`)));let o=!0;for(;!e.more()||e.peek()!==L.CODES.get("]")||o;){if(e.more()&&e.lookingAt("-")&&(this.flags&M.PERL_X)===0&&!o){const B=e.rest();if(B==="-"||!B.startsWith("-]"))throw e.rewindTo(t),new De(W.ERR_INVALID_CHAR_RANGE,e.rest())}o=!1;const a=e.pos();if(e.lookingAt("[:")){if(this.parseNamedClass(e,s))continue;e.rewindTo(a)}if(this.parseUnicodeClass(e,s)||this.parsePerlClassEscape(e,s))continue;e.rewindTo(a);const c=W.parseClassChar(e,t);let l=c;if(e.more()&&e.lookingAt("-")){if(e.skip(1),e.more()&&e.lookingAt("]"))e.skip(-1);else if(l=W.parseClassChar(e,t),l<c)throw new De(W.ERR_INVALID_CHAR_RANGE,e.from(a))}(this.flags&M.FOLD_CASE)===0?s.appendRange(c,l):s.appendFoldedRange(c,l)}e.skip(1),s.cleanClass(),i<0&&s.negateClass(),n.runes=s.toArray(),this.push(n)}},Fw=class Ur{static initTest(e){const t=Ur.compile(e),n=new Ur(t.expr,t.prog,t.numSubexp,t.longest);return n.cond=t.cond,n.prefix=t.prefix,n.prefixUTF8=t.prefixUTF8,n.prefixComplete=t.prefixComplete,n.prefixRune=t.prefixRune,n.prefilter=t.prefilter,n}static compile(e){return Ur.compileImpl(e,M.PERL,!1)}static compilePOSIX(e){return Ur.compileImpl(e,M.POSIX,!0)}static compileImpl(e,t,n){let s=Ow.parse(e,t);const i=s.maxCap();s=Pw.simplify(s);const o=Rw.build(s),a=Sw.compileRegexp(s),c=new Ur(e,a,i,n);c.prefilter=o.type===Ce.Type.NONE?null:o;const[l,B]=a.prefix();return c.prefixComplete=l,c.prefix=B,c.prefixUTF8=Z.stringToUtf8ByteArray(c.prefix),c.prefix.length>0&&(c.prefixRune=c.prefix.codePointAt(0)),c.namedGroups=s.namedGroups,c}static match(e,t){return Ur.compile(e).match(t)}constructor(e,t,n=0,s=0){this.expr=e,this.prog=t,this.numSubexp=n,this.longest=s,this.cond=t.startCond(),this.prefix=null,this.prefixUTF8=null,this.prefixComplete=!1,this.prefixRune=0,this.machinePool=[],this.dfa=new mw(this.prog),this.onepass=gp.compile(this.prog),this.prefilter=null}matchPrefixComplete(e,t,n,s){if((n===M.ANCHOR_START||n===M.ANCHOR_BOTH)&&t!==0)return null;let i=-1,o=-1;const a=e.prefixLength(this);if(n===M.UNANCHORED){const c=e.index(this,t);if(c<0)return null;i=t+c,o=i+a}else if(n===M.ANCHOR_BOTH){if(e.endPos()!==a||e.index(this,0)!==0)return null;i=0,o=a}else if(n===M.ANCHOR_START){if(e.index(this,0)!==0)return null;i=0,o=a}if(i<0)return null;if(s>0){const c=new Int32Array(s).fill(-1);return c[0]=i,c[1]=o,Array.from(c)}return[]}executeEngine(e,t,n,s){if(this.prefixComplete&&(s===0||this.numSubexp===0))return this.matchPrefixComplete(e,t,n,s);if(this.prefilter!==null&&n===M.UNANCHORED&&!this.prefilter.eval(e,t))return null;if(this.onepass!==null)return gp.execute(this,e,t,n,s);if(s>0)return this.prog.numLb===0&&e.endPos()<=Ua.maxBitStateLen(this.prog)?Ua.execute(this,e,t,n,s):this.doExecuteNFA(e,t,n,s);if(this.prog.numLb===0){const i=this.dfa.match(e,t,n);if(i!==null)return i?[]:null;if(e.endPos()<=Ua.maxBitStateLen(this.prog))return Ua.execute(this,e,t,n,s)}return this.doExecuteNFA(e,t,n,s)}numberOfCapturingGroups(){return this.numSubexp}numberOfInstructions(){return this.prog.numInst()}get(){return this.machinePool.length>0?this.machinePool.pop():null}reset(){this.machinePool.length=0}put(e){this.machinePool.push(e)}toString(){return this.expr}doExecuteNFA(e,t,n,s){let i=this.get();i||(i=pw.fromRE2(this)),i.init(s);const o=i.match(e,t,n)?i.submatches():null;return this.put(i),o}match(e){return this.executeEngine(we.fromUTF16(e),0,M.UNANCHORED,0)!==null}matchWithGroup(e,t,n,s,i){return e instanceof cs||(Z.isByteArray(e)?e=Qr.utf8(e):e=Qr.utf16(e)),this.matchMachineInput(e,t,n,s,i)}matchMachineInput(e,t,n,s,i){if(t>n)return[!1,null];const o=e.isUTF16Encoding()?we.fromUTF16(e.asCharSequence(),0,n):we.fromUTF8(e.asBytes(),0,n),a=this.executeEngine(o,t,s,2*i);return a===null?[!1,null]:[!0,a]}matchUTF8(e){return this.executeEngine(we.fromUTF8(e),0,M.UNANCHORED,0)!==null}replaceAll(e,t){return this.replaceAllFunc(e,()=>t,2*e.length+1)}replaceFirst(e,t){return this.replaceAllFunc(e,()=>t,1)}replaceAllFunc(e,t,n){let s=0,i=0,o="";const a=we.fromUTF16(e);let c=0;for(;i<=e.length;){const l=this.executeEngine(a,i,M.UNANCHORED,2);if(l===null||l.length===0)break;o+=e.substring(s,l[0]),(l[1]>s||l[0]===0)&&(o+=t(e.substring(l[0],l[1])),c++),s=l[1];const B=a.step(i)&7;if(i+B>l[1]?i+=B:i+1>l[1]?i++:i=l[1],c>=n)break}return o+=e.substring(s),o}pad(e){if(e===null)return null;let t=(1+this.numSubexp)*2;if(e.length<t){let n=new Array(t).fill(-1);for(let s=0;s<e.length;s++)n[s]=e[s];e=n}return e}allMatches(e,t,n=s=>s){let s=[];const i=e.endPos();t<0&&(t=i+1);let o=0,a=0,c=-1;for(;a<t&&o<=i;){const l=this.executeEngine(e,o,M.UNANCHORED,this.prog.numCap);if(l===null||l.length===0)break;let B=!0;if(l[1]===o){l[0]===c&&(B=!1);const f=e.step(o);f<0?o=i+1:o+=f&7}else o=l[1];c=l[1],B&&(s.push(n(this.pad(l))),a++)}return s}findUTF8(e){const t=this.executeEngine(we.fromUTF8(e),0,M.UNANCHORED,2);return t===null?null:e.slice(t[0],t[1])}findUTF8Index(e){const t=this.executeEngine(we.fromUTF8(e),0,M.UNANCHORED,2);return t===null?null:t.slice(0,2)}find(e){const t=this.executeEngine(we.fromUTF16(e),0,M.UNANCHORED,2);return t===null?"":e.substring(t[0],t[1])}findIndex(e){return this.executeEngine(we.fromUTF16(e),0,M.UNANCHORED,2)}findUTF8Submatch(e){const t=this.executeEngine(we.fromUTF8(e),0,M.UNANCHORED,this.prog.numCap);if(t===null)return null;const n=new Array(1+this.numSubexp).fill(null);for(let s=0;s<n.length;s++)2*s<t.length&&t[2*s]>=0&&(n[s]=e.slice(t[2*s],t[2*s+1]));return n}findUTF8SubmatchIndex(e){return this.pad(this.executeEngine(we.fromUTF8(e),0,M.UNANCHORED,this.prog.numCap))}findSubmatch(e){const t=this.executeEngine(we.fromUTF16(e),0,M.UNANCHORED,this.prog.numCap);if(t===null)return null;const n=new Array(1+this.numSubexp).fill(null);for(let s=0;s<n.length;s++)2*s<t.length&&t[2*s]>=0&&(n[s]=e.substring(t[2*s],t[2*s+1]));return n}findSubmatchIndex(e){return this.pad(this.executeEngine(we.fromUTF16(e),0,M.UNANCHORED,this.prog.numCap))}findAllUTF8(e,t){const n=this.allMatches(we.fromUTF8(e),t,s=>e.slice(s[0],s[1]));return n.length===0?null:n}findAllUTF8Index(e,t){const n=this.allMatches(we.fromUTF8(e),t,s=>s.slice(0,2));return n.length===0?null:n}findAll(e,t){const n=this.allMatches(we.fromUTF16(e),t,s=>e.substring(s[0],s[1]));return n.length===0?null:n}findAllIndex(e,t){const n=this.allMatches(we.fromUTF16(e),t,s=>s.slice(0,2));return n.length===0?null:n}findAllUTF8Submatch(e,t){const n=this.allMatches(we.fromUTF8(e),t,s=>{let i=new Array(s.length/2|0).fill(null);for(let o=0;o<i.length;o++)s[2*o]>=0&&(i[o]=e.slice(s[2*o],s[2*o+1]));return i});return n.length===0?null:n}findAllUTF8SubmatchIndex(e,t){const n=this.allMatches(we.fromUTF8(e),t);return n.length===0?null:n}findAllSubmatch(e,t){const n=this.allMatches(we.fromUTF16(e),t,s=>{let i=new Array(s.length/2|0).fill(null);for(let o=0;o<i.length;o++)s[2*o]>=0&&(i[o]=e.substring(s[2*o],s[2*o+1]));return i});return n.length===0?null:n}findAllSubmatchIndex(e,t){const n=this.allMatches(we.fromUTF16(e),t);return n.length===0?null:n}},Lw=class Vs{static isHexadecimal(e){return"0"<=e&&e<="9"||"A"<=e&&e<="F"||"a"<=e&&e<="f"}static translate(e){let t="";if(e instanceof RegExp&&(e.ignoreCase&&(t+="i"),e.multiline&&(t+="m"),e.dotAll&&(t+="s"),e=e.source),typeof e!="string")return e;let n="",s=!1,i=e.length;i===0&&(n="(?:)",s=!0);let o=!1,a=0;for(;a<i;){let l=e[a];if(l==="\\"){if(a+1<i)switch(l=e[a+1],l){case"\\":n+="\\\\",a+=2;continue;case"c":if(a+2<i){let p=e[a+2].charCodeAt(0);if(p>=65&&p<=90||p>=97&&p<=122){let m=p%32;n+="\\x",n+=(m>>4).toString(16).toUpperCase(),n+=(m&15).toString(16).toUpperCase(),a+=3,s=!0;continue}}n+="c",a+=2,s=!0;continue;case"u":if(a+2<i){if(e[a+2]==="{"){let p=a+3,m=!1,y=!1;for(;p<i;){const F=e[p];if(F==="}"){y=!0;break}if(!Vs.isHexadecimal(F))break;m=!0,p++}if(y&&m){n+="\\x",a+=2,s=!0;continue}}else if(a+5<i){let p=!0;for(let m=0;m<4;m++)if(!Vs.isHexadecimal(e[a+2+m])){p=!1;break}if(p){n+="\\x{"+e.substring(a+2,a+6)+"}",a+=6,s=!0;continue}}}n+="u",a+=2,s=!0;continue;case"x":{let p=!1;if(a+2<i&&e[a+2]==="{"){let m=a+3,y=!1,F=!1;for(;m<i;){const V=e[m];if(V==="}"){F=!0;break}if(!Vs.isHexadecimal(V))break;y=!0,m++}F&&y&&(p=!0)}else a+3<i&&Vs.isHexadecimal(e[a+2])&&Vs.isHexadecimal(e[a+3])&&(p=!0);p?(n+="\\x",a+=2):(n+="x",a+=2,s=!0);continue}case"n":case"r":case"t":case"a":case"f":case"v":case"d":case"D":case"s":case"S":case"w":case"W":case"b":case"B":case"p":case"P":case"A":case"z":case"Q":case"E":case"0":case"1":case"2":case"3":case"4":case"5":case"6":case"7":n+="\\"+l,a+=2;continue;default:{let p=e.codePointAt(a+1);if(p>=48&&p<=57||p>=65&&p<=90||p>=97&&p<=122){let m=Z.charCount(p);n+=e.substring(a+1,a+1+m),a+=m+1,s=!0}else{n+="\\";let m=Z.charCount(p);n+=e.substring(a+1,a+1+m),a+=m+1}continue}}}else if(l==="/"){n+="\\/",a+=1,s=!0;continue}else if(l==="[")o=!0;else if(l==="]")o=!1;else if(!o&&l==="("&&a+2<i&&e[a+1]==="?"&&e[a+2]==="<"&&a+3<i&&!"=!>)".includes(e[a+3])){n+="(?P<",a+=3,s=!0;continue}let B=e.codePointAt(a),f=Z.charCount(B);n+=e.substring(a,a+f),a+=f}const c=s?n:e;return t.length>0?`(?${t})${c}`:c}},WB=class rn{static CASE_INSENSITIVE=bs.CASE_INSENSITIVE;static DOTALL=bs.DOTALL;static MULTILINE=bs.MULTILINE;static DISABLE_UNICODE_GROUPS=bs.DISABLE_UNICODE_GROUPS;static LONGEST_MATCH=bs.LONGEST_MATCH;static LOOKBEHINDS=bs.LOOKBEHINDS;static quote(e){return Z.quoteMeta(e)}static quoteReplacement(e,t=!1){return fp.quoteReplacement(e,t)}static translateRegExp(e){return Lw.translate(e)}static compile(e,t=0){let n=e;if((t&rn.CASE_INSENSITIVE)!==0&&(n=`(?i)${n}`),(t&rn.DOTALL)!==0&&(n=`(?s)${n}`),(t&rn.MULTILINE)!==0&&(n=`(?m)${n}`),(t&-544)!==0)throw new dw("Flags should only be a combination of MULTILINE, DOTALL, CASE_INSENSITIVE, DISABLE_UNICODE_GROUPS, LONGEST_MATCH, LOOKBEHINDS");let s=M.PERL;(t&rn.DISABLE_UNICODE_GROUPS)!==0&&(s&=-129),(t&rn.LOOKBEHINDS)!==0&&(s|=M.LOOKBEHIND);const i=new rn(e,t);return i.re2Input=Fw.compileImpl(n,s,(t&rn.LONGEST_MATCH)!==0),i}static matches(e,t){return rn.compile(e).testExact(t)}static initTest(e,t,n){if(e==null)throw new Error("pattern is null");if(n==null)throw new Error("re2 is null");const s=new rn(e,t);return s.re2Input=n,s}constructor(e,t){this.patternInput=e,this.flagsInput=t,this.re2Input=null}reset(){this.re2Input.reset()}flags(){return this.flagsInput}pattern(){return this.patternInput}re2(){return this.re2Input}matches(e){return this.testExact(e)}matcher(e){return Z.isByteArray(e)&&(e=Qr.utf8(e)),new fp(this,e)}test(e){return Z.isByteArray(e)?this.re2Input.matchUTF8(e):this.re2Input.match(e)}testExact(e){const t=Z.isByteArray(e)?we.fromUTF8(e):we.fromUTF16(e);return this.re2Input.executeEngine(t,0,M.ANCHOR_BOTH,0)!==null}exec(e){const t=this.matcher(e);if(!t.find())return null;const n=[t.group(0)];for(let i=1;i<=t.groupCount();i++){const o=t.group(i);n.push(o===null?void 0:o)}n.index=t.start(0),n.input=e;const s=this.namedGroups();if(Object.keys(s).length>0){const i=t.getNamedGroups();for(const o in i)i[o]===null&&(i[o]=void 0);n.groups=i}else n.groups=void 0;return n}split(e,t=0){const n=this.matcher(e),s=[];let i=0,o=0;for(;n.find();){if(o===0&&n.end()===0){o=n.end();continue}if(t>0&&s.length===t-1)break;if(o===n.start()){if(t===0){i+=1,o=n.end();continue}}else for(;i>0;)s.push(""),i-=1;s.push(n.substring(o,n.start())),o=n.end()}if(t===0&&o!==n.inputLength()){for(;i>0;)s.push(""),i-=1;s.push(n.substring(o,n.inputLength()))}return(t!==0||s.length===0&&!(o===n.inputLength()&&o>0))&&s.push(n.substring(o,n.inputLength())),s}*matchAll(e){const t=this.matcher(e);for(;t.find();){const n=[t.group(0)];for(let i=1;i<=t.groupCount();i++){const o=t.group(i);n.push(o===null?void 0:o)}n.index=t.start(0),n.input=e;const s=this.namedGroups();if(Object.keys(s).length>0){const i=t.getNamedGroups();for(const o in i)i[o]===null&&(i[o]=void 0);n.groups=i}else n.groups=void 0;yield n}}toString(){return this.patternInput}programSize(){return this.re2Input.numberOfInstructions()}groupCount(){return this.re2Input.numberOfCapturingGroups()}namedGroups(){return this.re2Input.namedGroups}equals(e){return this===e?!0:e===null||this.constructor!==e.constructor?!1:this.flagsInput===e.flagsInput&&this.patternInput===e.patternInput}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let _i="12.19.0";function kw(r){_i=r}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const us=new Zo("@firebase/firestore");function Ms(){return us.logLevel}function G(r,...e){if(us.logLevel<=Be.DEBUG){const t=e.map(YB);us.debug(`Firestore (${_i}): ${r}`,...t)}}function Fe(r,...e){if(us.logLevel<=Be.ERROR){const t=e.map(YB);us.error(`Firestore (${_i}): ${r}`,...t)}}function Yt(r,...e){if(us.logLevel<=Be.WARN){const t=e.map(YB);us.warn(`Firestore (${_i}): ${r}`,...t)}}function YB(r){if(typeof r=="string")return r;try{return(function(t){return JSON.stringify(t)})(r)}catch{return r}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function z(r,e,t){let n="Unexpected state";typeof e=="string"?n=e:t=e,Nm(r,n,t)}function Nm(r,e,t){let n=`FIRESTORE (${_i}) INTERNAL ASSERTION FAILED: ${e} (ID: ${r.toString(16)})`;if(t!==void 0)try{n+=" CONTEXT: "+JSON.stringify(t)}catch{n+=" CONTEXT: "+t}throw Fe(n),new Error(n)}function H(r,e,t,n){let s="Unexpected state";typeof t=="string"?s=t:n=t,r||Nm(e,s,n)}function Q(r,e){return r}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function xw(r){const e=typeof self<"u"&&(self.crypto||self.msCrypto),t=new Uint8Array(r);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(t);else for(let n=0;n<r;n++)t[n]=Math.floor(256*Math.random());return t}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class XB{static newId(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",t=62*Math.floor(4.129032258064516);let n="";for(;n.length<20;){const s=xw(40);for(let i=0;i<s.length;++i)n.length<20&&s[i]<t&&(n+=e.charAt(s[i]%62))}return n}}function ie(r,e){return r<e?-1:r>e?1:0}function sB(r,e){const t=Math.min(r.length,e.length);for(let n=0;n<t;n++){const s=r.charAt(n),i=e.charAt(n);if(s!==i)return Tl(s)===Tl(i)?ie(s,i):Tl(s)?1:-1}return ie(r.length,e.length)}const Vw=55296,Mw=57343;function Tl(r){const e=r.charCodeAt(0);return e>=Vw&&e<=Mw}function Xs(r,e,t){return r.length===e.length&&r.every(((n,s)=>t(n,e[s])))}function Om(r){return r+"\0"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ie{constructor(e,t){this.comparator=e,this.root=t||Ye.EMPTY}insert(e,t){return new Ie(this.comparator,this.root.insert(e,t,this.comparator).copy(null,null,Ye.BLACK,null,null))}remove(e){return new Ie(this.comparator,this.root.remove(e,this.comparator).copy(null,null,Ye.BLACK,null,null))}get(e){let t=this.root;for(;!t.isEmpty();){const n=this.comparator(e,t.key);if(n===0)return t.value;n<0?t=t.left:n>0&&(t=t.right)}return null}indexOf(e){let t=0,n=this.root;for(;!n.isEmpty();){const s=this.comparator(e,n.key);if(s===0)return t+n.left.size;s<0?n=n.left:(t+=n.left.size+1,n=n.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(e){return this.root.inorderTraversal(e)}forEach(e){this.inorderTraversal(((t,n)=>(e(t,n),!1)))}toString(){const e=[];return this.inorderTraversal(((t,n)=>(e.push(`${t}:${n}`),!1))),`{${e.join(", ")}}`}reverseTraversal(e){return this.root.reverseTraversal(e)}getIterator(){return new qa(this.root,null,this.comparator,!1)}getIteratorFrom(e){return new qa(this.root,e,this.comparator,!1)}getReverseIterator(){return new qa(this.root,null,this.comparator,!0)}getReverseIteratorFrom(e){return new qa(this.root,e,this.comparator,!0)}}class qa{constructor(e,t,n,s){this.isReverse=s,this.nodeStack=[];let i=1;for(;!e.isEmpty();)if(i=t?n(e.key,t):1,t&&s&&(i*=-1),i<0)e=this.isReverse?e.left:e.right;else{if(i===0){this.nodeStack.push(e);break}this.nodeStack.push(e),e=this.isReverse?e.right:e.left}}getNext(){let e=this.nodeStack.pop();const t={key:e.key,value:e.value};if(this.isReverse)for(e=e.left;!e.isEmpty();)this.nodeStack.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack.push(e),e=e.left;return t}hasNext(){return this.nodeStack.length>0}peek(){if(this.nodeStack.length===0)return null;const e=this.nodeStack[this.nodeStack.length-1];return{key:e.key,value:e.value}}}class Ye{constructor(e,t,n,s,i){this.key=e,this.value=t,this.color=n??Ye.RED,this.left=s??Ye.EMPTY,this.right=i??Ye.EMPTY,this.size=this.left.size+1+this.right.size}copy(e,t,n,s,i){return new Ye(e??this.key,t??this.value,n??this.color,s??this.left,i??this.right)}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,t,n){let s=this;const i=n(e,s.key);return s=i<0?s.copy(null,null,null,s.left.insert(e,t,n),null):i===0?s.copy(null,t,null,null,null):s.copy(null,null,null,null,s.right.insert(e,t,n)),s.fixUp()}removeMin(){if(this.left.isEmpty())return Ye.EMPTY;let e=this;return e.left.isRed()||e.left.left.isRed()||(e=e.moveRedLeft()),e=e.copy(null,null,null,e.left.removeMin(),null),e.fixUp()}remove(e,t){let n,s=this;if(t(e,s.key)<0)s.left.isEmpty()||s.left.isRed()||s.left.left.isRed()||(s=s.moveRedLeft()),s=s.copy(null,null,null,s.left.remove(e,t),null);else{if(s.left.isRed()&&(s=s.rotateRight()),s.right.isEmpty()||s.right.isRed()||s.right.left.isRed()||(s=s.moveRedRight()),t(e,s.key)===0){if(s.right.isEmpty())return Ye.EMPTY;n=s.right.min(),s=s.copy(n.key,n.value,null,null,s.right.removeMin())}s=s.copy(null,null,null,null,s.right.remove(e,t))}return s.fixUp()}isRed(){return this.color}fixUp(){let e=this;return e.right.isRed()&&!e.left.isRed()&&(e=e.rotateLeft()),e.left.isRed()&&e.left.left.isRed()&&(e=e.rotateRight()),e.left.isRed()&&e.right.isRed()&&(e=e.colorFlip()),e}moveRedLeft(){let e=this.colorFlip();return e.right.left.isRed()&&(e=e.copy(null,null,null,null,e.right.rotateRight()),e=e.rotateLeft(),e=e.colorFlip()),e}moveRedRight(){let e=this.colorFlip();return e.left.left.isRed()&&(e=e.rotateRight(),e=e.colorFlip()),e}rotateLeft(){const e=this.copy(null,null,Ye.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight(){const e=this.copy(null,null,Ye.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip(){const e=this.left.copy(null,null,!this.left.color,null,null),t=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,t)}checkMaxDepth(){const e=this.check();return Math.pow(2,e)<=this.size+1}check(){if(this.isRed()&&this.left.isRed())throw z(43730,{key:this.key,value:this.value});if(this.right.isRed())throw z(14113,{key:this.key,value:this.value});const e=this.left.check();if(e!==this.right.check())throw z(27949);return e+(this.isRed()?0:1)}}Ye.EMPTY=null,Ye.RED=!0,Ye.BLACK=!1;Ye.EMPTY=new class{constructor(){this.size=0}get key(){throw z(57766)}get value(){throw z(16141)}get color(){throw z(16727)}get left(){throw z(29726)}get right(){throw z(36894)}copy(e,t,n,s,i){return this}insert(e,t,n){return new Ye(e,t)}remove(e,t){return this}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class me{constructor(e){this.comparator=e,this.data=new Ie(this.comparator)}has(e){return this.data.get(e)!==null}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(e){return this.data.indexOf(e)}forEach(e){this.data.inorderTraversal(((t,n)=>(e(t),!1)))}forEachInRange(e,t){const n=this.data.getIteratorFrom(e[0]);for(;n.hasNext();){const s=n.getNext();if(this.comparator(s.key,e[1])>=0)return;t(s.key)}}forEachWhile(e,t){let n;for(n=t!==void 0?this.data.getIteratorFrom(t):this.data.getIterator();n.hasNext();)if(!e(n.getNext().key))return}firstAfterOrEqual(e){const t=this.data.getIteratorFrom(e);return t.hasNext()?t.getNext().key:null}getIterator(){return new Vp(this.data.getIterator())}getIteratorFrom(e){return new Vp(this.data.getIteratorFrom(e))}add(e){return this.copy(this.data.remove(e).insert(e,!0))}delete(e){return this.has(e)?this.copy(this.data.remove(e)):this}isEmpty(){return this.data.isEmpty()}unionWith(e){let t=this;return t.size<e.size&&(t=e,e=this),e.forEach((n=>{t=t.add(n)})),t}isEqual(e){if(!(e instanceof me)||this.size!==e.size)return!1;const t=this.data.getIterator(),n=e.data.getIterator();for(;t.hasNext();){const s=t.getNext().key,i=n.getNext().key;if(this.comparator(s,i)!==0)return!1}return!0}toArray(){const e=[];return this.forEach((t=>{e.push(t)})),e}toString(){const e=[];return this.forEach((t=>e.push(t))),"SortedSet("+e.toString()+")"}copy(e){const t=new me(this.comparator);return t.data=e,t}}class Vp{constructor(e){this.iter=e}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}function Ss(r){return r.hasNext()?r.getNext():void 0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const O={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};let U=class extends xt{constructor(e,t){super(e,t),this.code=e,this.message=t,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const an="__name__";class sn{constructor(e,t,n){t===void 0?t=0:t>e.length&&z(637,{offset:t,range:e.length}),n===void 0?n=e.length-t:n>e.length-t&&z(1746,{length:n,range:e.length-t}),this.segments=e,this.offset=t,this.len=n}get length(){return this.len}isEqual(e){return sn.comparator(this,e)===0}child(e){const t=this.segments.slice(this.offset,this.limit());return e instanceof sn?e.forEach((n=>{t.push(n)})):t.push(e),this.construct(t)}limit(){return this.offset+this.length}popFirst(e){return e=e===void 0?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return this.length===0}isPrefixOf(e){if(e.length<this.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}forEach(e){for(let t=this.offset,n=this.limit();t<n;t++)e(this.segments[t])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,t){const n=Math.min(e.length,t.length);for(let s=0;s<n;s++){const i=sn.compareSegments(e.get(s),t.get(s));if(i!==0)return i}return ie(e.length,t.length)}static compareSegments(e,t){const n=sn.isNumericId(e),s=sn.isNumericId(t);return n&&!s?-1:!n&&s?1:n&&s?sn.extractNumericId(e).compare(sn.extractNumericId(t)):sB(e,t)}static isNumericId(e){return e.startsWith("__id")&&e.endsWith("__")}static extractNumericId(e){return hr.fromString(e.substring(4,e.length-2))}}class le extends sn{construct(e,t,n){return new le(e,t,n)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toStringWithLeadingSlash(){return`/${this.canonicalString()}`}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){const t=[];for(const n of e){if(n.indexOf("//")>=0)throw new U(O.INVALID_ARGUMENT,`Invalid segment (${n}). Paths must not contain // in them.`);t.push(...n.split("/").filter((s=>s.length>0)))}return new le(t)}static emptyPath(){return new le([])}}const Gw=/^[_a-zA-Z][_a-zA-Z0-9]*$/;let Ge=class Gs extends sn{construct(e,t,n){return new Gs(e,t,n)}static isValidIdentifier(e){return Gw.test(e)}canonicalString(){return this.toArray().map((e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),Gs.isValidIdentifier(e)||(e="`"+e+"`"),e))).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)===an}static keyField(){return new Gs([an])}static fromServerFormat(e){const t=[];let n="",s=0;const i=()=>{if(n.length===0)throw new U(O.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);t.push(n),n=""};let o=!1;for(;s<e.length;){const a=e[s];if(a==="\\"){if(s+1===e.length)throw new U(O.INVALID_ARGUMENT,"Path has trailing escape character: "+e);const c=e[s+1];if(c!=="\\"&&c!=="."&&c!=="`")throw new U(O.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);n+=c,s+=2}else a==="`"?(o=!o,s++):a!=="."||o?(n+=a,s++):(i(),s++)}if(i(),o)throw new U(O.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new Gs(t)}static emptyPath(){return new Gs([])}};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _t{constructor(e){this.fields=e,e.sort(Ge.comparator)}static empty(){return new _t([])}unionWith(e){let t=new me(Ge.comparator);for(const n of this.fields)t=t.add(n);for(const n of e)t=t.add(n);return new _t(t.toArray())}covers(e){for(const t of this.fields)if(t.isPrefixOf(e))return!0;return!1}isEqual(e){return Xs(this.fields,e.fields,((t,n)=>t.isEqual(n)))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function wc(r){let e=0;for(const t in r)Object.prototype.hasOwnProperty.call(r,t)&&e++;return e}function Rr(r,e){for(const t in r)Object.prototype.hasOwnProperty.call(r,t)&&e(t,r[t])}function Uw(r,e){const t=[];for(const n in r)Object.prototype.hasOwnProperty.call(r,n)&&t.push(e(r[n],n,r));return t}function Fm(r){for(const e in r)if(Object.prototype.hasOwnProperty.call(r,e))return!1;return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class K{constructor(e){this.path=e}static fromPath(e){return new K(le.fromString(e))}static fromName(e){return new K(le.fromString(e).popFirst(5))}static empty(){return new K(le.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(e){return this.path.length>=2&&this.path.get(this.path.length-2)===e}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(e){return e!==null&&le.comparator(this.path,e.path)===0}toString(){return this.path.toString()}static comparator(e,t){return le.comparator(e.path,t.path)}static isDocumentKey(e){return e.length%2==0}static fromSegments(e){return new K(new le(e.slice()))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Lm(r,e,t){if(!t)throw new U(O.INVALID_ARGUMENT,`Function ${r}() cannot be called with an empty ${e}.`)}function Hw(r,e,t,n){if(e===!0&&n===!0)throw new U(O.INVALID_ARGUMENT,`${r} and ${t} cannot be used together.`)}function Mp(r){if(!K.isDocumentKey(r))throw new U(O.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${r} has ${r.length}.`)}function Gp(r){if(K.isDocumentKey(r))throw new U(O.INVALID_ARGUMENT,`Invalid collection reference. Collection references must have an odd number of segments, but ${r} has ${r.length}.`)}function na(r){return typeof r=="object"&&r!==null&&(Object.getPrototypeOf(r)===Object.prototype||Object.getPrototypeOf(r)===null)}function cu(r){if(r===void 0)return"undefined";if(r===null)return"null";if(typeof r=="string")return r.length>20&&(r=`${r.substring(0,20)}...`),JSON.stringify(r);if(typeof r=="number"||typeof r=="boolean")return""+r;if(typeof r=="object"){if(r instanceof Array)return"an array";{const e=(function(n){return n.constructor?n.constructor.name:null})(r);return e?`a custom ${e} object`:"an object"}}return typeof r=="function"?"a function":z(12329,{type:typeof r})}function dt(r,e){if("_delegate"in r&&(r=r._delegate),!(r instanceof e)){if(e.name===r.constructor.name)throw new U(O.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const t=cu(r);throw new U(O.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${t}`)}}return r}function qw(r,e){if(e<=0)throw new U(O.INVALID_ARGUMENT,`Function ${r}() requires a positive number, but it was: ${e}.`)}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ke(r,e){const t={typeString:r};return e&&(t.value=e),t}function ra(r,e){if(!na(r))throw new U(O.INVALID_ARGUMENT,"JSON must be an object");let t;for(const n in e)if(e[n]){const s=e[n].typeString,i="value"in e[n]?{value:e[n].value}:void 0;if(!(n in r)){t=`JSON missing required field: '${n}'`;break}const o=r[n];if(s&&typeof o!==s){t=`JSON field '${n}' must be a ${s}.`;break}if(i!==void 0&&o!==i.value){t=`Expected '${n}' field to equal '${i.value}'`;break}}if(t)throw new U(O.INVALID_ARGUMENT,t);return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Up=-62135596800,Hp=1e6;class ge{static now(){return ge.fromMillis(Date.now())}static fromDate(e){return ge.fromMillis(e.getTime())}static fromMillis(e){const t=Math.floor(e/1e3),n=Math.floor((e-1e3*t)*Hp);return new ge(t,n)}static fromInstant(e){if(!e||typeof e.t!="bigint")throw new U(O.INVALID_ARGUMENT,"Invalid Temporal.Instant object provided.");return ge._fromEpochNanoseconds(e.t)}static _fromEpochNanoseconds(e){let t,n;if(e>=0n)t=Number(e/1000000000n),n=Number(e%1000000000n);else{const s=e%1000000000n;s===0n?(t=Number(e/1000000000n),n=0):(t=Number(e/1000000000n-1n),n=Number(s+1000000000n))}return new ge(t,n)}constructor(e,t){if(this.seconds=e,this.nanoseconds=t,t<0)throw new U(O.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(t>=1e9)throw new U(O.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(e<Up)throw new U(O.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new U(O.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/Hp}toInstant(){if(typeof Temporal>"u"||!Temporal.Instant)throw new U(O.FAILED_PRECONDITION,"The Temporal object is not available in the current environment.");const e=1000000000n*BigInt(this.seconds)+BigInt(this.nanoseconds);return Temporal.Instant.__PRIVATE_fromEpochNanoseconds(e)}_compareTo(e){return this.seconds===e.seconds?ie(this.nanoseconds,e.nanoseconds):ie(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{type:ge._jsonSchemaVersion,seconds:this.seconds,nanoseconds:this.nanoseconds}}static fromJSON(e){if(ra(e,ge._jsonSchema))return new ge(e.seconds,e.nanoseconds)}valueOf(){const e=this.seconds-Up;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}ge._jsonSchemaVersion="firestore/timestamp/1.0",ge._jsonSchema={type:ke("string",ge._jsonSchemaVersion),seconds:ke("number"),nanoseconds:ke("number")};/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class km extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class be{constructor(e){this.binaryString=e}static fromBase64String(e){const t=(function(s){try{return atob(s)}catch(i){throw typeof DOMException<"u"&&i instanceof DOMException?new km("Invalid base64 string: "+i):i}})(e);return new be(t)}static fromUint8Array(e){const t=(function(s){let i="";for(let o=0;o<s.length;++o)i+=String.fromCharCode(s[o]);return i})(e);return new be(t)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return(function(t){return btoa(t)})(this.binaryString)}toUint8Array(){return(function(t){const n=new Uint8Array(t.length);for(let s=0;s<t.length;s++)n[s]=t.charCodeAt(s);return n})(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return ie(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}}be.EMPTY_BYTE_STRING=new be("");const jw=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function Pn(r){if(H(!!r,39018),typeof r=="string"){let e=0;const t=jw.exec(r);if(H(!!t,46558,{timestamp:r}),t[1]){let s=t[1];s=(s+"000000000").substr(0,9),e=Number(s)}const n=new Date(r);return{seconds:Math.floor(n.getTime()/1e3),nanos:e}}return{seconds:ye(r.seconds),nanos:ye(r.nanos)}}function ye(r){return typeof r=="number"?r:typeof r=="string"?Number(r):0}function Nn(r){return typeof r=="string"?be.fromBase64String(r):be.fromUint8Array(r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const xm="server_timestamp",Vm="__type__",Mm="__previous_value__",Gm="__local_write_time__";function uu(r){return(r?.mapValue?.fields||{})[Vm]?.stringValue===xm}function sa(r){const e=r.mapValue.fields[Mm];return uu(e)?sa(e):e}function Zs(r){const e=Pn(r.mapValue.fields[Gm].timestampValue);return new ge(e.seconds,e.nanos)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Kw{constructor(e,t,n,s,i,o,a,c,l,B,f,p,m){this.databaseId=e,this.appId=t,this.persistenceKey=n,this.host=s,this.ssl=i,this.forceLongPolling=o,this.autoDetectLongPolling=a,this.longPollingOptions=c,this.useFetchStreams=l,this.isUsingEmulator=B,this.apiKey=f,this._customHeaders=p,this.grpcFlowControlWindow=m}}const Ac="(default)";class ls{constructor(e,t){this.projectId=e,this.database=t||Ac}static empty(){return new ls("","")}get isDefaultDatabase(){return this.database===Ac}isEqual(e){return e instanceof ls&&e.projectId===this.projectId&&e.database===this.database}}function Jw(r,e){if(!Object.prototype.hasOwnProperty.apply(r.options,["projectId"]))throw new U(O.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new ls(r.options.projectId,e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Zr=-1;function ia(r){return r==null}function ei(r){return r===0&&1/r==-1/0}function Um(r){return typeof r=="number"&&Number.isInteger(r)&&!ei(r)&&r<=Number.MAX_SAFE_INTEGER&&r>=Number.MIN_SAFE_INTEGER}function zw(r){return typeof r=="string"}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ZB="__type__",Hm="__max__",ur={mapValue:{fields:{__type__:{stringValue:Hm}}}},eh="__vector__",Bs="value",fn={nullValue:"NULL_VALUE"},yt={booleanValue:!0},$e={booleanValue:!1};function xe(r){return"nullValue"in r?0:"booleanValue"in r?1:"integerValue"in r||"doubleValue"in r?2:"timestampValue"in r?3:"stringValue"in r?5:"bytesValue"in r?6:"referenceValue"in r?7:"geoPointValue"in r?8:"arrayValue"in r?9:"mapValue"in r?uu(r)?4:qm(r)?9007199254740991:hs(r)?10:11:z(28295,{value:r})}function jt(r,e,t){if(r===e)return!0;const n=xe(r);if(n!==xe(e))return!1;switch(n){case 0:case 9007199254740991:return!0;case 1:return r.booleanValue===e.booleanValue;case 4:return Zs(r).isEqual(Zs(e));case 3:return(function(i,o){if(typeof i.timestampValue=="string"&&typeof o.timestampValue=="string"&&i.timestampValue.length===o.timestampValue.length)return i.timestampValue===o.timestampValue;const a=Pn(i.timestampValue),c=Pn(o.timestampValue);return a.seconds===c.seconds&&a.nanos===c.nanos})(r,e);case 5:return r.stringValue===e.stringValue;case 6:return(function(i,o){return Nn(i.bytesValue).isEqual(Nn(o.bytesValue))})(r,e);case 7:return r.referenceValue===e.referenceValue;case 8:return(function(i,o){return ye(i.geoPointValue.latitude)===ye(o.geoPointValue.latitude)&&ye(i.geoPointValue.longitude)===ye(o.geoPointValue.longitude)})(r,e);case 2:return(function(i,o,a){if("integerValue"in i&&"integerValue"in o)return ye(i.integerValue)===ye(o.integerValue);let c,l;if("doubleValue"in i&&"doubleValue"in o)c=ye(i.doubleValue),l=ye(o.doubleValue);else{if(!a?.i)return!1;c=ye(i.integerValue??i.doubleValue),l=ye(o.integerValue??o.doubleValue)}return c===l?!!a?.o||ei(c)===ei(l):!!(a===void 0||a.u)&&isNaN(c)&&isNaN(l)})(r,e,t);case 9:return Xs(r.arrayValue.values||[],e.arrayValue.values||[],((s,i)=>jt(s,i,t)));case 10:case 11:return(function(i,o,a){const c=i.mapValue.fields||{},l=o.mapValue.fields||{};if(wc(c)!==wc(l))return!1;for(const B in c)if(c.hasOwnProperty(B)&&(l[B]===void 0||!jt(c[B],l[B],a)))return!1;return!0})(r,e,t);default:return z(52216,{left:r})}}function Po(r,e){return(r.values||[]).find((t=>jt(t,e)))!==void 0}function at(r,e){if(r===e)return 0;const t=xe(r),n=xe(e);if(t!==n)return ie(t,n);switch(t){case 0:case 9007199254740991:return 0;case 1:return ie(r.booleanValue,e.booleanValue);case 2:return(function(i,o){const a=ye(i.integerValue||i.doubleValue),c=ye(o.integerValue||o.doubleValue);return a<c?-1:a>c?1:a===c?0:isNaN(a)?isNaN(c)?0:-1:1})(r,e);case 3:return qp(r.timestampValue,e.timestampValue);case 4:return qp(Zs(r),Zs(e));case 5:return sB(r.stringValue,e.stringValue);case 6:return(function(i,o){const a=Nn(i),c=Nn(o);return a.compareTo(c)})(r.bytesValue,e.bytesValue);case 7:return(function(i,o){const a=i.split("/"),c=o.split("/");for(let l=0;l<a.length&&l<c.length;l++){const B=ie(a[l],c[l]);if(B!==0)return B}return ie(a.length,c.length)})(r.referenceValue,e.referenceValue);case 8:return(function(i,o){const a=ie(ye(i.latitude),ye(o.latitude));return a!==0?a:ie(ye(i.longitude),ye(o.longitude))})(r.geoPointValue,e.geoPointValue);case 9:return jp(r.arrayValue,e.arrayValue);case 10:return(function(i,o){const a=i.fields||{},c=o.fields||{},l=a[Bs]?.arrayValue,B=c[Bs]?.arrayValue,f=ie(l?.values?.length||0,B?.values?.length||0);return f!==0?f:jp(l,B)})(r.mapValue,e.mapValue);case 11:return(function(i,o){if(i===ur.mapValue&&o===ur.mapValue)return 0;if(i===ur.mapValue)return 1;if(o===ur.mapValue)return-1;const a=i.fields||{},c=Object.keys(a),l=o.fields||{},B=Object.keys(l);c.sort(),B.sort();for(let f=0;f<c.length&&f<B.length;++f){const p=sB(c[f],B[f]);if(p!==0)return p;const m=at(a[c[f]],l[B[f]]);if(m!==0)return m}return ie(c.length,B.length)})(r.mapValue,e.mapValue);default:throw z(23264,{l:t})}}function qp(r,e){if(typeof r=="string"&&typeof e=="string"&&r.length===e.length)return ie(r,e);const t=Pn(r),n=Pn(e),s=ie(t.seconds,n.seconds);return s!==0?s:ie(t.nanos,n.nanos)}function jp(r,e){const t=r.values||[],n=e.values||[];for(let s=0;s<t.length&&s<n.length;++s){const i=at(t[s],n[s]);if(i!==void 0&&i!==0)return i}return ie(t.length,n.length)}function ti(r){return iB(r)}function iB(r){return"nullValue"in r?"null":"booleanValue"in r?""+r.booleanValue:"integerValue"in r?""+r.integerValue:"doubleValue"in r?""+r.doubleValue:"timestampValue"in r?(function(t){const n=Pn(t);return`time(${n.seconds},${n.nanos})`})(r.timestampValue):"stringValue"in r?r.stringValue:"bytesValue"in r?(function(t){return Nn(t).toBase64()})(r.bytesValue):"referenceValue"in r?(function(t){return K.fromName(t).toString()})(r.referenceValue):"geoPointValue"in r?(function(t){return`geo(${t.latitude},${t.longitude})`})(r.geoPointValue):"arrayValue"in r?(function(t){let n="[",s=!0;for(const i of t.values||[])s?s=!1:n+=",",n+=iB(i);return n+"]"})(r.arrayValue):"mapValue"in r?(function(t){const n=Object.keys(t.fields||{}).sort();let s="{",i=!0;for(const o of n)i?i=!1:s+=",",s+=`${o}:${iB(t.fields[o])}`;return s+"}"})(r.mapValue):z(61005,{value:r})}function rc(r){switch(xe(r)){case 0:case 1:return 4;case 2:return 8;case 3:case 8:return 16;case 4:const e=sa(r);return e?16+rc(e):16;case 5:return 2*r.stringValue.length;case 6:return Nn(r.bytesValue).approximateByteSize();case 7:return r.referenceValue.length;case 9:return(function(n){return(n.values||[]).reduce(((s,i)=>s+rc(i)),0)})(r.arrayValue);case 10:case 11:return(function(n){let s=0;return Rr(n.fields,((i,o)=>{s+=i.length+rc(o)})),s})(r.mapValue);default:throw z(13486,{value:r})}}function No(r,e){return{referenceValue:`projects/${r.projectId}/databases/${r.database}/documents/${e.path.canonicalString()}`}}function cn(r){return!!r&&"integerValue"in r}function Wr(r){return!!r&&"doubleValue"in r}function gr(r){return cn(r)||Wr(r)}function mr(r){return!!r&&"arrayValue"in r}function Pt(r){return!!r&&"nullValue"in r}function Tt(r){return!!r&&"doubleValue"in r&&isNaN(Number(r.doubleValue))}function es(r){return!!r&&"mapValue"in r}function hs(r){return(r?.mapValue?.fields||{})[ZB]?.stringValue===eh}function oB(r){return(r?.mapValue?.fields||{})[Bs]?.arrayValue}function Bo(r){if(r.geoPointValue)return{geoPointValue:{...r.geoPointValue}};if(r.timestampValue&&typeof r.timestampValue=="object")return{timestampValue:{...r.timestampValue}};if(r.mapValue){const e={mapValue:{fields:{}}};return Rr(r.mapValue.fields,((t,n)=>e.mapValue.fields[t]=Bo(n))),e}if(r.arrayValue){const e={arrayValue:{values:[]}};for(let t=0;t<(r.arrayValue.values||[]).length;++t)e.arrayValue.values[t]=Bo(r.arrayValue.values[t]);return e}return{...r}}function qm(r){return(((r.mapValue||{}).fields||{}).__type__||{}).stringValue===Hm}const jm={mapValue:{fields:{[ZB]:{stringValue:eh},[Bs]:{arrayValue:{}}}}};function $w(r){return"nullValue"in r?fn:"booleanValue"in r?{booleanValue:!1}:"integerValue"in r||"doubleValue"in r?{doubleValue:NaN}:"timestampValue"in r?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"stringValue"in r?{stringValue:""}:"bytesValue"in r?{bytesValue:""}:"referenceValue"in r?No(ls.empty(),K.empty()):"geoPointValue"in r?{geoPointValue:{latitude:-90,longitude:-180}}:"arrayValue"in r?{arrayValue:{}}:"mapValue"in r?hs(r)?jm:{mapValue:{}}:z(35942,{value:r})}function Qw(r){return"nullValue"in r?{booleanValue:!1}:"booleanValue"in r?{doubleValue:NaN}:"integerValue"in r||"doubleValue"in r?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"timestampValue"in r?{stringValue:""}:"stringValue"in r?{bytesValue:""}:"bytesValue"in r?No(ls.empty(),K.empty()):"referenceValue"in r?{geoPointValue:{latitude:-90,longitude:-180}}:"geoPointValue"in r?{arrayValue:{}}:"arrayValue"in r?jm:"mapValue"in r?hs(r)?{mapValue:{}}:ur:z(61959,{value:r})}function Kp(r,e){const t=at(r.value,e.value);return t!==0?t:r.inclusive&&!e.inclusive?-1:!r.inclusive&&e.inclusive?1:0}function Jp(r,e){const t=at(r.value,e.value);return t!==0?t:r.inclusive&&!e.inclusive?1:!r.inclusive&&e.inclusive?-1:0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ze{constructor(e){this.value=e}static empty(){return new ze({mapValue:{}})}field(e){if(e.isEmpty())return this.value;{let t=this.value;for(let n=0;n<e.length-1;++n)if(t=(t.mapValue.fields||{})[e.get(n)],!es(t))return null;return t=(t.mapValue.fields||{})[e.lastSegment()],t||null}}set(e,t){this.getFieldsMap(e.popLast())[e.lastSegment()]=Bo(t)}setAll(e){let t=Ge.emptyPath(),n={},s=[];e.forEach(((o,a)=>{if(!t.isImmediateParentOf(a)){const c=this.getFieldsMap(t);this.applyChanges(c,n,s),n={},s=[],t=a.popLast()}o?n[a.lastSegment()]=Bo(o):s.push(a.lastSegment())}));const i=this.getFieldsMap(t);this.applyChanges(i,n,s)}delete(e){const t=this.field(e.popLast());es(t)&&t.mapValue.fields&&delete t.mapValue.fields[e.lastSegment()]}isEqual(e){return jt(this.value,e.value)}getFieldsMap(e){let t=this.value;t.mapValue.fields||(t.mapValue={fields:{}});for(let n=0;n<e.length;++n){let s=t.mapValue.fields[e.get(n)];es(s)&&s.mapValue.fields||(s={mapValue:{fields:{}}},t.mapValue.fields[e.get(n)]=s),t=s}return t.mapValue.fields}applyChanges(e,t,n){Rr(t,((s,i)=>e[s]=i));for(const s of n)delete e[s]}clone(){return new ze(Bo(this.value))}}function Km(r){const e=[];return Rr(r.fields,((t,n)=>{const s=new Ge([t]);if(es(n)){const i=Km(n.mapValue).fields;if(i.length===0)e.push(s);else for(const o of i)e.push(s.child(o))}else e.push(s)})),new _t(e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function lu(r,e){if(r.useProto3Json){if(isNaN(e))return{doubleValue:"NaN"};if(e===1/0)return{doubleValue:"Infinity"};if(e===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:ei(e)?"-0":e}}function th(r){return{integerValue:""+r}}function Bu(r,e,t){return Um(e)?th(e):lu(r,e)}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hu{constructor(){this._=void 0}}function Ww(r,e,t){return r instanceof ni?(function(s,i){const o={fields:{[Vm]:{stringValue:xm},[Gm]:{timestampValue:{seconds:s.seconds,nanos:s.nanoseconds}}}};return i&&uu(i)&&(i=sa(i)),i&&(o.fields[Mm]=i),{mapValue:o}})(t,e):r instanceof ri?zm(r,e):r instanceof si?$m(r,e):r instanceof fs?(function(s,i){const o=Jm(s,i),a=vc(o)+vc(s.h);return cn(o)&&cn(s.h)?th(a):lu(s.serializer,a)})(r,e):r instanceof Oo?(function(s,i){return zp(s,i,Math.min)})(r,e):r instanceof Fo?(function(s,i){return zp(s,i,Math.max)})(r,e):void 0}function Yw(r,e,t){return r instanceof ri?zm(r,e):r instanceof si?$m(r,e):t}function Jm(r,e){return r instanceof fs?gr(e)?e:{integerValue:0}:null}class ni extends hu{}class ri extends hu{constructor(e){super(),this.elements=e}}function zm(r,e){const t=Qm(e);for(const n of r.elements)t.some((s=>jt(s,n)))||t.push(n);return{arrayValue:{values:t}}}class si extends hu{constructor(e){super(),this.elements=e}}function $m(r,e){let t=Qm(e);for(const n of r.elements)t=t.filter((s=>!jt(s,n)));return{arrayValue:{values:t}}}class nh extends hu{constructor(e,t){super(),this.serializer=e,this.h=t}}class fs extends nh{}class Oo extends nh{}class Fo extends nh{}function zp(r,e,t){if(!gr(e))return r.h;const n=t(vc(e),vc(r.h));return cn(e)&&cn(r.h)?th(n):lu(r.serializer,n)}function vc(r){return ye(r.integerValue||r.doubleValue)}function Qm(r){return mr(r)&&r.arrayValue.values?r.arrayValue.values.slice():[]}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rh{constructor(e,t){this.field=e,this.transform=t}}function Xw(r,e){return r.field.isEqual(e.field)&&(function(n,s){return n instanceof ri&&s instanceof ri||n instanceof si&&s instanceof si?Xs(n.elements,s.elements,jt):n instanceof fs&&s instanceof fs||n instanceof Oo&&s instanceof Oo||n instanceof Fo&&s instanceof Fo?jt(n.h,s.h):n instanceof ni&&s instanceof ni})(r.transform,e.transform)}class Zw{constructor(e,t){this.version=e,this.transformResults=t}}class ve{constructor(e,t){this.updateTime=e,this.exists=t}static none(){return new ve}static exists(e){return new ve(void 0,e)}static updateTime(e){return new ve(e)}get isNone(){return this.updateTime===void 0&&this.exists===void 0}isEqual(e){return this.exists===e.exists&&(this.updateTime?!!e.updateTime&&this.updateTime.isEqual(e.updateTime):!e.updateTime)}}function sc(r,e){return r.updateTime!==void 0?e.isFoundDocument()&&e.version.isEqual(r.updateTime):r.exists===void 0||r.exists===e.isFoundDocument()}class fu{}function Wm(r,e){if(!r.hasLocalMutations||e&&e.fields.length===0)return null;if(e===null)return r.isNoDocument()?new Ii(r.key,ve.none()):new Ei(r.key,r.data,ve.none());{const t=r.data,n=ze.empty();let s=new me(Ge.comparator);for(let i of e.fields)if(!s.has(i)){let o=t.field(i);o===null&&i.length>1&&(i=i.popLast(),o=t.field(i)),o===null?n.delete(i):n.set(i,o),s=s.add(i)}return new Mn(r.key,n,new _t(s.toArray()),ve.none())}}function eA(r,e,t){r instanceof Ei?(function(s,i,o){const a=s.value.clone(),c=Qp(s.fieldTransforms,i,o.transformResults);a.setAll(c),i.convertToFoundDocument(o.version,a).setHasCommittedMutations()})(r,e,t):r instanceof Mn?(function(s,i,o){if(!sc(s.precondition,i))return void i.convertToUnknownDocument(o.version);const a=Qp(s.fieldTransforms,i,o.transformResults),c=i.data;c.setAll(Ym(s)),c.setAll(a),i.convertToFoundDocument(o.version,c).setHasCommittedMutations()})(r,e,t):(function(s,i,o){i.convertToNoDocument(o.version).setHasCommittedMutations()})(0,e,t)}function ho(r,e,t,n){return r instanceof Ei?(function(i,o,a,c){if(!sc(i.precondition,o))return a;const l=i.value.clone(),B=Wp(i.fieldTransforms,c,o);return l.setAll(B),o.convertToFoundDocument(o.version,l).setHasLocalMutations(),null})(r,e,t,n):r instanceof Mn?(function(i,o,a,c){if(!sc(i.precondition,o))return a;const l=Wp(i.fieldTransforms,c,o),B=o.data;return B.setAll(Ym(i)),B.setAll(l),o.convertToFoundDocument(o.version,B).setHasLocalMutations(),a===null?null:a.unionWith(i.fieldMask.fields).unionWith(i.fieldTransforms.map((f=>f.field)))})(r,e,t,n):(function(i,o,a){return sc(i.precondition,o)?(o.convertToNoDocument(o.version).setHasLocalMutations(),null):a})(r,e,t)}function tA(r,e){let t=null;for(const n of r.fieldTransforms){const s=e.data.field(n.field),i=Jm(n.transform,s||null);i!=null&&(t===null&&(t=ze.empty()),t.set(n.field,i))}return t||null}function $p(r,e){return r.type===e.type&&!!r.key.isEqual(e.key)&&!!r.precondition.isEqual(e.precondition)&&!!(function(n,s){return n===void 0&&s===void 0||!(!n||!s)&&Xs(n,s,((i,o)=>Xw(i,o)))})(r.fieldTransforms,e.fieldTransforms)&&(r.type===0?r.value.isEqual(e.value):r.type!==1||r.data.isEqual(e.data)&&r.fieldMask.isEqual(e.fieldMask))}class Ei extends fu{constructor(e,t,n,s=[]){super(),this.key=e,this.value=t,this.precondition=n,this.fieldTransforms=s,this.type=0}getFieldMask(){return null}}class Mn extends fu{constructor(e,t,n,s,i=[]){super(),this.key=e,this.data=t,this.fieldMask=n,this.precondition=s,this.fieldTransforms=i,this.type=1}getFieldMask(){return this.fieldMask}}function Ym(r){const e=new Map;return r.fieldMask.fields.forEach((t=>{if(!t.isEmpty()){const n=r.data.field(t);e.set(t,n)}})),e}function Qp(r,e,t){const n=new Map;H(r.length===t.length,32656,{T:t.length,P:r.length});for(let s=0;s<t.length;s++){const i=r[s],o=i.transform,a=e.data.field(i.field);n.set(i.field,Yw(o,a,t[s]))}return n}function Wp(r,e,t){const n=new Map;for(const s of r){const i=s.transform,o=t.data.field(s.field);n.set(s.field,Ww(i,o,e))}return n}class Ii extends fu{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class sh extends fu{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ii{constructor(e,t){this.position=e,this.inclusive=t}}function Yp(r,e,t){let n=0;for(let s=0;s<r.position.length;s++){const i=e[s],o=r.position[s];if(i.field.isKeyField()?n=K.comparator(K.fromName(o.referenceValue),t.key):n=at(o,t.data.field(i.field)),i.dir==="desc"&&(n*=-1),n!==0)break}return n}function Xp(r,e){if(r===null)return e===null;if(e===null||r.inclusive!==e.inclusive||r.position.length!==e.position.length)return!1;for(let t=0;t<r.position.length;t++)if(!jt(r.position[t],e.position[t]))return!1;return!0}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xm{}class he extends Xm{constructor(e,t,n){super(),this.field=e,this.op=t,this.value=n}static create(e,t,n){return e.isKeyField()?t==="in"||t==="not-in"?this.createKeyFieldInFilter(e,t,n):new nA(e,t,n):t==="array-contains"?new iA(e,n):t==="in"?new s_(e,n):t==="not-in"?new oA(e,n):t==="array-contains-any"?new aA(e,n):new he(e,t,n)}static createKeyFieldInFilter(e,t,n){return t==="in"?new rA(e,n):new sA(e,n)}matches(e){const t=e.data.field(this.field);return this.op==="!="?t!==null&&t.nullValue===void 0&&this.matchesComparison(at(t,this.value)):t!==null&&xe(this.value)===xe(t)&&this.matchesComparison(at(t,this.value))}matchesComparison(e){switch(this.op){case"<":return e<0;case"<=":return e<=0;case"==":return e===0;case"!=":return e!==0;case">":return e>0;case">=":return e>=0;default:return z(47266,{operator:this.op})}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class _e extends Xm{constructor(e,t){super(),this.filters=e,this.op=t,this.I=null}static create(e,t){return new _e(e,t)}matches(e){return oi(this)?this.filters.find((t=>!t.matches(e)))===void 0:this.filters.find((t=>t.matches(e)))!==void 0}getFlattenedFilters(){return this.I!==null||(this.I=this.filters.reduce(((e,t)=>e.concat(t.getFlattenedFilters())),[])),this.I}getFilters(){return Object.assign([],this.filters)}}function oi(r){return r.op==="and"}function aB(r){return r.op==="or"}function ih(r){return Zm(r)&&oi(r)}function Zm(r){for(const e of r.filters)if(e instanceof _e)return!1;return!0}function cB(r){if(r instanceof he)return r.field.canonicalString()+r.op.toString()+ti(r.value);if(ih(r))return r.filters.map((e=>cB(e))).join(",");{const e=r.filters.map((t=>cB(t))).join(",");return`${r.op}(${e})`}}function e_(r,e){return r instanceof he?(function(n,s){return s instanceof he&&n.op===s.op&&n.field.isEqual(s.field)&&jt(n.value,s.value)})(r,e):r instanceof _e?(function(n,s){return s instanceof _e&&n.op===s.op&&n.filters.length===s.filters.length?n.filters.reduce(((i,o,a)=>i&&e_(o,s.filters[a])),!0):!1})(r,e):void z(19439)}function t_(r,e){const t=r.filters.concat(e);return _e.create(t,r.op)}function n_(r){return r instanceof he?(function(t){return`${t.field.canonicalString()} ${t.op} ${ti(t.value)}`})(r):r instanceof _e?(function(t){return t.op.toString()+" {"+t.getFilters().map(n_).join(" ,")+"}"})(r):"Filter"}class nA extends he{constructor(e,t,n){super(e,t,n),this.key=K.fromName(n.referenceValue)}matches(e){const t=K.comparator(e.key,this.key);return this.matchesComparison(t)}}class rA extends he{constructor(e,t){super(e,"in",t),this.keys=r_("in",t)}matches(e){return this.keys.some((t=>t.isEqual(e.key)))}}class sA extends he{constructor(e,t){super(e,"not-in",t),this.keys=r_("not-in",t)}matches(e){return!this.keys.some((t=>t.isEqual(e.key)))}}function r_(r,e){return(e.arrayValue?.values||[]).map((t=>K.fromName(t.referenceValue)))}class iA extends he{constructor(e,t){super(e,"array-contains",t)}matches(e){const t=e.data.field(this.field);return mr(t)&&Po(t.arrayValue,this.value)}}class s_ extends he{constructor(e,t){super(e,"in",t)}matches(e){const t=e.data.field(this.field);return t!==null&&Po(this.value.arrayValue,t)}}class oA extends he{constructor(e,t){super(e,"not-in",t)}matches(e){if(Po(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const t=e.data.field(this.field);return t!==null&&t.nullValue===void 0&&!Po(this.value.arrayValue,t)}}class aA extends he{constructor(e,t){super(e,"array-contains-any",t)}matches(e){const t=e.data.field(this.field);return!(!mr(t)||!t.arrayValue.values)&&t.arrayValue.values.some((n=>Po(this.value.arrayValue,n)))}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Lo{constructor(e,t="asc"){this.field=e,this.dir=t}}function cA(r,e){return r.dir===e.dir&&r.field.isEqual(e.field)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class X{static fromTimestamp(e){return new X(e)}static min(){return new X(new ge(0,0))}static max(){return new X(new ge(253402300799,999999999))}constructor(e){this.timestamp=e}compareTo(e){return this.timestamp._compareTo(e.timestamp)}isEqual(e){return this.timestamp.isEqual(e.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ae{constructor(e,t,n,s,i,o,a){this.key=e,this.documentType=t,this.version=n,this.readTime=s,this.createTime=i,this.data=o,this.documentState=a}static newInvalidDocument(e){return new Ae(e,0,X.min(),X.min(),X.min(),ze.empty(),0)}static newFoundDocument(e,t,n,s){return new Ae(e,1,t,X.min(),n,s,0)}static newNoDocument(e,t){return new Ae(e,2,t,X.min(),X.min(),ze.empty(),0)}static newUnknownDocument(e,t){return new Ae(e,3,t,X.min(),X.min(),ze.empty(),2)}convertToFoundDocument(e,t){return!this.createTime.isEqual(X.min())||this.documentType!==2&&this.documentType!==0||(this.createTime=e),this.version=e,this.documentType=1,this.data=t,this.documentState=0,this}convertToNoDocument(e){return this.version=e,this.documentType=2,this.data=ze.empty(),this.documentState=0,this}convertToUnknownDocument(e){return this.version=e,this.documentType=3,this.data=ze.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=X.min(),this}setReadTime(e){return this.readTime=e,this}get hasLocalMutations(){return this.documentState===1}get hasCommittedMutations(){return this.documentState===2}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return this.documentType!==0}isFoundDocument(){return this.documentType===1}isNoDocument(){return this.documentType===2}isUnknownDocument(){return this.documentType===3}isEqual(e){return e instanceof Ae&&this.key.isEqual(e.key)&&this.version.isEqual(e.version)&&this.documentType===e.documentType&&this.documentState===e.documentState&&this.data.isEqual(e.data)}mutableCopy(){return new Ae(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ai=-1;class Rc{constructor(e,t,n,s){this.indexId=e,this.collectionGroup=t,this.fields=n,this.indexState=s}}function uB(r){return r.fields.find((e=>e.kind===2))}function Hr(r){return r.fields.filter((e=>e.kind!==2))}Rc.UNKNOWN_ID=-1;class ic{constructor(e,t){this.fieldPath=e,this.kind=t}}class ko{constructor(e,t){this.sequenceNumber=e,this.offset=t}static empty(){return new ko(0,kt.min())}}function i_(r,e){const t=r.toTimestamp().seconds,n=r.toTimestamp().nanoseconds+1,s=X.fromTimestamp(n===1e9?new ge(t+1,0):new ge(t,n));return new kt(s,K.empty(),e)}function o_(r){return new kt(r.readTime,r.key,ai)}class kt{constructor(e,t,n){this.readTime=e,this.documentKey=t,this.largestBatchId=n}static min(){return new kt(X.min(),K.empty(),ai)}static max(){return new kt(X.max(),K.empty(),ai)}}function oh(r,e){let t=r.readTime.compareTo(e.readTime);return t!==0?t:(t=K.comparator(r.documentKey,e.documentKey),t!==0?t:ie(r.largestBatchId,e.largestBatchId))}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class uA{constructor(e,t=null,n=[],s=[],i=null,o=null,a=null){this.path=e,this.collectionGroup=t,this.orderBy=n,this.filters=s,this.limit=i,this.startAt=o,this.endAt=a,this.R=null}}function lB(r,e=null,t=[],n=[],s=null,i=null,o=null){return new uA(r,e,t,n,s,i,o)}function bc(r){const e=Q(r);if(e.R===null){let t=e.path.canonicalString();e.collectionGroup!==null&&(t+="|cg:"+e.collectionGroup),t+="|f:",t+=e.filters.map((n=>cB(n))).join(","),t+="|ob:",t+=e.orderBy.map((n=>(function(i){return i.field.canonicalString()+i.dir})(n))).join(","),ia(e.limit)||(t+="|l:",t+=e.limit),e.startAt&&(t+="|lb:",t+=e.startAt.inclusive?"b:":"a:",t+=e.startAt.position.map((n=>ti(n))).join(",")),e.endAt&&(t+="|ub:",t+=e.endAt.inclusive?"a:":"b:",t+=e.endAt.position.map((n=>ti(n))).join(",")),e.R=t}return e.R}function ah(r,e){if(r.limit!==e.limit||r.orderBy.length!==e.orderBy.length)return!1;for(let t=0;t<r.orderBy.length;t++)if(!cA(r.orderBy[t],e.orderBy[t]))return!1;if(r.filters.length!==e.filters.length)return!1;for(let t=0;t<r.filters.length;t++)if(!e_(r.filters[t],e.filters[t]))return!1;return r.collectionGroup===e.collectionGroup&&!!r.path.isEqual(e.path)&&!!Xp(r.startAt,e.startAt)&&Xp(r.endAt,e.endAt)}function Dn(r){return!!r.isCorePipeline}function ch(r){return!!r.path&&K.isDocumentKey(r.path)&&r.collectionGroup===null&&r.filters.length===0}function Sc(r,e){return r.filters.filter((t=>t instanceof he&&t.field.isEqual(e)))}function Zp(r,e,t){let n=fn,s=!0;for(const i of Sc(r,e)){let o=fn,a=!0;switch(i.op){case"<":case"<=":o=$w(i.value);break;case"==":case"in":case">=":o=i.value;break;case">":o=i.value,a=!1;break;case"!=":case"not-in":o=fn}Kp({value:n,inclusive:s},{value:o,inclusive:a})<0&&(n=o,s=a)}if(t!==null){for(let i=0;i<r.orderBy.length;++i)if(r.orderBy[i].field.isEqual(e)){const o=t.position[i];Kp({value:n,inclusive:s},{value:o,inclusive:t.inclusive})<0&&(n=o,s=t.inclusive);break}}return{value:n,inclusive:s}}function eC(r,e,t){let n=ur,s=!0;for(const i of Sc(r,e)){let o=ur,a=!0;switch(i.op){case">=":case">":o=Qw(i.value),a=!1;break;case"==":case"in":case"<=":o=i.value;break;case"<":o=i.value,a=!1;break;case"!=":case"not-in":o=ur}Jp({value:n,inclusive:s},{value:o,inclusive:a})>0&&(n=o,s=a)}if(t!==null){for(let i=0;i<r.orderBy.length;++i)if(r.orderBy[i].field.isEqual(e)){const o=t.position[i];Jp({value:n,inclusive:s},{value:o,inclusive:t.inclusive})>0&&(n=o,s=t.inclusive);break}}return{value:n,inclusive:s}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Di{constructor(e,t=null,n=[],s=[],i=null,o="F",a=null,c=null){this.path=e,this.collectionGroup=t,this.explicitOrderBy=n,this.filters=s,this.limit=i,this.limitType=o,this.startAt=a,this.endAt=c,this.A=null,this.V=null,this.m=null,this.startAt,this.endAt}}function a_(r,e,t,n,s,i,o,a){return new Di(r,e,t,n,s,i,o,a)}function oa(r){return new Di(r)}function tC(r){return r.filters.length===0&&r.limit===null&&r.startAt==null&&r.endAt==null&&(r.explicitOrderBy.length===0||r.explicitOrderBy.length===1&&r.explicitOrderBy[0].field.isKeyField())}function lA(r){return K.isDocumentKey(r.path)&&r.collectionGroup===null&&r.filters.length===0}function c_(r){return r.collectionGroup!==null}function fo(r){const e=Q(r);if(e.A===null){e.A=[];const t=new Set;for(const i of e.explicitOrderBy)e.A.push(i),t.add(i.field.canonicalString());const n=e.explicitOrderBy.length>0?e.explicitOrderBy[e.explicitOrderBy.length-1].dir:"asc";(function(o){let a=new me(Ge.comparator);return o.filters.forEach((c=>{c.getFlattenedFilters().forEach((l=>{l.isInequality()&&(a=a.add(l.field))}))})),a})(e).forEach((i=>{t.has(i.canonicalString())||i.isKeyField()||e.A.push(new Lo(i,n))})),t.has(Ge.keyField().canonicalString())||e.A.push(new Lo(Ge.keyField(),n))}return e.A}function Ot(r){const e=Q(r);return e.V||(e.V=BA(e,fo(r))),e.V}function BA(r,e){if(r.limitType==="F")return lB(r.path,r.collectionGroup,e,r.filters,r.limit,r.startAt,r.endAt);{e=e.map((s=>{const i=s.dir==="desc"?"asc":"desc";return new Lo(s.field,i)}));const t=r.endAt?new ii(r.endAt.position,r.endAt.inclusive):null,n=r.startAt?new ii(r.startAt.position,r.startAt.inclusive):null;return lB(r.path,r.collectionGroup,e,r.filters,r.limit,t,n)}}function BB(r,e){const t=r.filters.concat([e]);return new Di(r.path,r.collectionGroup,r.explicitOrderBy.slice(),t,r.limit,r.limitType,r.startAt,r.endAt)}function hA(r,e){const t=r.explicitOrderBy.concat([e]);return new Di(r.path,r.collectionGroup,t,r.filters.slice(),r.limit,r.limitType,r.startAt,r.endAt)}function Pc(r,e,t){return new Di(r.path,r.collectionGroup,r.explicitOrderBy.slice(),r.filters.slice(),e,t,r.startAt,r.endAt)}function fA(r,e){return ah(Ot(r),Ot(e))&&r.limitType===e.limitType}function po(r){return`Query(target=${(function(t){let n=t.path.canonicalString();return t.collectionGroup!==null&&(n+=" collectionGroup="+t.collectionGroup),t.filters.length>0&&(n+=`, filters: [${t.filters.map((s=>n_(s))).join(", ")}]`),ia(t.limit)||(n+=", limit: "+t.limit),t.orderBy.length>0&&(n+=`, orderBy: [${t.orderBy.map((s=>(function(o){return`${o.field.canonicalString()} (${o.dir})`})(s))).join(", ")}]`),t.startAt&&(n+=", startAt: ",n+=t.startAt.inclusive?"b:":"a:",n+=t.startAt.position.map((s=>ti(s))).join(",")),t.endAt&&(n+=", endAt: ",n+=t.endAt.inclusive?"a:":"b:",n+=t.endAt.position.map((s=>ti(s))).join(",")),`Target(${n})`})(Ot(r))}; limitType=${r.limitType})`}function du(r,e){return e.isFoundDocument()&&(function(n,s){const i=s.key.path;return n.collectionGroup!==null?s.key.hasCollectionId(n.collectionGroup)&&n.path.isPrefixOf(i):K.isDocumentKey(n.path)?n.path.isEqual(i):n.path.isImmediateParentOf(i)})(r,e)&&(function(n,s){for(const i of fo(n))if(!i.field.isKeyField()&&s.data.field(i.field)===null)return!1;return!0})(r,e)&&(function(n,s){for(const i of n.filters)if(!i.matches(s))return!1;return!0})(r,e)&&(function(n,s){return!(n.startAt&&!(function(o,a,c){const l=Yp(o,a,c);return o.inclusive?l<=0:l<0})(n.startAt,fo(n),s)||n.endAt&&!(function(o,a,c){const l=Yp(o,a,c);return o.inclusive?l>=0:l>0})(n.endAt,fo(n),s))})(r,e)}function uh(r){return(e,t)=>{let n=!1;for(const s of fo(r)){const i=dA(s,e,t);if(i!==0)return i;n=n||s.field.isKeyField()}return 0}}function dA(r,e,t){const n=r.field.isKeyField()?K.comparator(e.key,t.key):(function(i,o,a){const c=o.data.field(i),l=a.data.field(i);return c!==null&&l!==null?at(c,l):z(42886)})(r.field,e,t);switch(r.dir){case"asc":return n;case"desc":return-1*n;default:return z(19790,{direction:r.dir})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pA{constructor(e,t){this.count=e,this.unchangedNames=t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Le,de;function u_(r){switch(r){case O.OK:return z(64938);case O.CANCELLED:case O.UNKNOWN:case O.DEADLINE_EXCEEDED:case O.RESOURCE_EXHAUSTED:case O.INTERNAL:case O.UNAVAILABLE:case O.UNAUTHENTICATED:return!1;case O.INVALID_ARGUMENT:case O.NOT_FOUND:case O.ALREADY_EXISTS:case O.PERMISSION_DENIED:case O.FAILED_PRECONDITION:case O.ABORTED:case O.OUT_OF_RANGE:case O.UNIMPLEMENTED:case O.DATA_LOSS:return!0;default:return z(15467,{code:r})}}function l_(r){if(r===void 0)return Fe("GRPC error has no .code"),O.UNKNOWN;switch(r){case Le.OK:return O.OK;case Le.CANCELLED:return O.CANCELLED;case Le.UNKNOWN:return O.UNKNOWN;case Le.DEADLINE_EXCEEDED:return O.DEADLINE_EXCEEDED;case Le.RESOURCE_EXHAUSTED:return O.RESOURCE_EXHAUSTED;case Le.INTERNAL:return O.INTERNAL;case Le.UNAVAILABLE:return O.UNAVAILABLE;case Le.UNAUTHENTICATED:return O.UNAUTHENTICATED;case Le.INVALID_ARGUMENT:return O.INVALID_ARGUMENT;case Le.NOT_FOUND:return O.NOT_FOUND;case Le.ALREADY_EXISTS:return O.ALREADY_EXISTS;case Le.PERMISSION_DENIED:return O.PERMISSION_DENIED;case Le.FAILED_PRECONDITION:return O.FAILED_PRECONDITION;case Le.ABORTED:return O.ABORTED;case Le.OUT_OF_RANGE:return O.OUT_OF_RANGE;case Le.UNIMPLEMENTED:return O.UNIMPLEMENTED;case Le.DATA_LOSS:return O.DATA_LOSS;default:return z(39323,{code:r})}}(de=Le||(Le={}))[de.OK=0]="OK",de[de.CANCELLED=1]="CANCELLED",de[de.UNKNOWN=2]="UNKNOWN",de[de.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",de[de.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",de[de.NOT_FOUND=5]="NOT_FOUND",de[de.ALREADY_EXISTS=6]="ALREADY_EXISTS",de[de.PERMISSION_DENIED=7]="PERMISSION_DENIED",de[de.UNAUTHENTICATED=16]="UNAUTHENTICATED",de[de.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",de[de.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",de[de.ABORTED=10]="ABORTED",de[de.OUT_OF_RANGE=11]="OUT_OF_RANGE",de[de.UNIMPLEMENTED=12]="UNIMPLEMENTED",de[de.INTERNAL=13]="INTERNAL",de[de.UNAVAILABLE=14]="UNAVAILABLE",de[de.DATA_LOSS=15]="DATA_LOSS";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Gn{constructor(e,t){this.mapKeyFn=e,this.equalsFn=t,this.inner={},this.innerSize=0}get(e){const t=this.mapKeyFn(e),n=this.inner[t];if(n!==void 0){for(const[s,i]of n)if(this.equalsFn(s,e))return i}}has(e){return this.get(e)!==void 0}set(e,t){const n=this.mapKeyFn(e),s=this.inner[n];if(s===void 0)return this.inner[n]=[[e,t]],void this.innerSize++;for(let i=0;i<s.length;i++)if(this.equalsFn(s[i][0],e))return void(s[i]=[e,t]);s.push([e,t]),this.innerSize++}delete(e){const t=this.mapKeyFn(e),n=this.inner[t];if(n===void 0)return!1;for(let s=0;s<n.length;s++)if(this.equalsFn(n[s][0],e))return n.length===1?delete this.inner[t]:n.splice(s,1),this.innerSize--,!0;return!1}forEach(e){Rr(this.inner,((t,n)=>{for(const[s,i]of n)e(s,i)}))}isEmpty(){return Fm(this.inner)}size(){return this.innerSize}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const CA=new Ie(K.comparator);function Me(){return CA}const B_=new Ie(K.comparator);function jr(...r){let e=B_;for(const t of r)e=e.insert(t.key,t);return e}function h_(r){let e=B_;return r.forEach(((t,n)=>e=e.insert(t,n.overlayedDocument))),e}function Ht(){return Co()}function f_(){return Co()}function Co(){return new Gn((r=>r.toString()),((r,e)=>r.isEqual(e)))}const gA=new Ie(K.comparator),mA=new me(K.comparator);function ae(...r){let e=mA;for(const t of r)e=e.add(t);return e}const _A=new me(ie);function lh(){return _A}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function EA(){return new TextEncoder}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const IA=new hr([4294967295,4294967295],0);function nC(r){const e=EA().encode(r),t=new _m;return t.update(e),new Uint8Array(t.digest())}function rC(r){const e=new DataView(r.buffer),t=e.getUint32(0,!0),n=e.getUint32(4,!0),s=e.getUint32(8,!0),i=e.getUint32(12,!0);return[new hr([t,n],0),new hr([s,i],0)]}class Bh{constructor(e,t,n){if(this.bitmap=e,this.padding=t,this.hashCount=n,t<0||t>=8)throw new ao(`Invalid padding: ${t}`);if(n<0)throw new ao(`Invalid hash count: ${n}`);if(e.length>0&&this.hashCount===0)throw new ao(`Invalid hash count: ${n}`);if(e.length===0&&t!==0)throw new ao(`Invalid padding when bitmap length is 0: ${t}`);this.p=8*e.length-t,this.S=hr.fromNumber(this.p)}v(e,t,n){let s=e.add(t.multiply(hr.fromNumber(n)));return s.compare(IA)===1&&(s=new hr([s.getBits(0),s.getBits(1)],0)),s.modulo(this.S).toNumber()}D(e){return!!(this.bitmap[Math.floor(e/8)]&1<<e%8)}mightContain(e){if(this.p===0)return!1;const t=nC(e),[n,s]=rC(t);for(let i=0;i<this.hashCount;i++){const o=this.v(n,s,i);if(!this.D(o))return!1}return!0}static create(e,t,n){const s=e%8==0?0:8-e%8,i=new Uint8Array(Math.ceil(e/8)),o=new Bh(i,s,t);return n.forEach((a=>o.insert(a))),o}insert(e){if(this.p===0)return;const t=nC(e),[n,s]=rC(t);for(let i=0;i<this.hashCount;i++){const o=this.v(n,s,i);this.C(o)}}C(e){const t=Math.floor(e/8),n=e%8;this.bitmap[t]|=1<<n}}class ao extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yi{constructor(e,t,n,s,i,o){this.snapshotVersion=e,this.targetChanges=t,this.targetMismatches=n,this.documentUpdates=s,this.augmentedDocumentUpdates=i,this.resolvedLimboDocuments=o}static createSynthesizedRemoteEventForCurrentChange(e,t,n){const s=new Map;return s.set(e,aa.createSynthesizedTargetChangeForCurrentChange(e,t,n)),new yi(X.min(),s,new Ie(ie),Me(),Me(),ae())}}class aa{constructor(e,t,n,s,i){this.resumeToken=e,this.current=t,this.addedDocuments=n,this.modifiedDocuments=s,this.removedDocuments=i}static createSynthesizedTargetChangeForCurrentChange(e,t,n){return new aa(n,t,ae(),ae(),ae())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class oc{constructor(e,t,n,s){this.F=e,this.removedTargetIds=t,this.key=n,this.O=s}}class d_{constructor(e,t){this.targetId=e,this.M=t}}class p_{constructor(e,t,n=be.EMPTY_BYTE_STRING,s=null){this.state=e,this.targetIds=t,this.resumeToken=n,this.cause=s}}class sC{constructor(e){this.targetId=e,this.N=0,this.L=iC(),this.B=be.EMPTY_BYTE_STRING,this.U=!1,this.k=!0}get current(){return this.U}get resumeToken(){return this.B}get q(){return this.N!==0}get $(){return this.k}K(e){e.approximateByteSize()>0&&(this.k=!0,this.B=e)}W(){let e=ae(),t=ae(),n=ae();return this.L.forEach(((s,i)=>{switch(i){case 0:e=e.add(s);break;case 2:t=t.add(s);break;case 1:n=n.add(s);break;default:z(38017,{changeType:i})}})),new aa(this.B,this.U,e,t,n)}G(){this.k=!1,this.L=iC()}j(e,t){this.k=!0,this.L=this.L.insert(e,t)}H(e){this.k=!0,this.L=this.L.remove(e)}J(){this.N+=1}Y(){this.N-=1,H(this.N>=0,3241,{N:this.N,targetId:this.targetId})}Z(){this.k=!0,this.U=!0}}const Wi="WatchChangeAggregator";class DA{constructor(e){this.X=e,this.ee=new Map,this.te=Me(),this.ne=ja(),this.re=Me(),this.ie=ja(),this.se=new Ie(ie)}_e(e){for(const t of e.F)e.O&&e.O.isFoundDocument()?this.oe(t,e.O):this.ae(t,e.key,e.O);for(const t of e.removedTargetIds)this.ae(t,e.key,e.O)}ue(e){this.forEachTarget(e,(t=>{const n=this.ee.get(t);if(n)switch(e.state){case 0:this.ce(t)&&n.K(e.resumeToken);break;case 1:n.Y(),n.q||n.G(),n.K(e.resumeToken);break;case 2:n.Y(),n.q||this.removeTarget(t);break;case 3:this.ce(t)&&(n.Z(),n.K(e.resumeToken));break;case 4:this.ce(t)&&(this.le(t),n.K(e.resumeToken));break;default:z(56790,{state:e.state})}else G(Wi,`handleTargetChange received targetChange for untracked target ID (${t}) with state (${e.state})`)}))}forEachTarget(e,t){e.targetIds.length>0?e.targetIds.forEach(t):this.ee.forEach(((n,s)=>{this.ce(s)&&t(s)}))}Ee(e){return Dn(e)?e.getPipelineSourceType()==="documents"&&e.getPipelineDocuments()?.length===1:ch(e)}he(e){const t=e.targetId,n=e.M.count,s=this.Te(t);if(s){const i=s.target;if(this.Ee(i))if(n===0){const o=new K(Dn(i)?le.fromString(i.getPipelineDocuments()[0]):i.path);this.ae(t,o,Ae.newNoDocument(o,X.min()))}else H(n===1,20013,"Single document existence filter with count: "+n);else{const o=this.Pe(t);if(o!==n){const a=this.Ie(e),c=a?this.Re(a,e,o):1;if(c!==0){this.le(t);const l=c===2?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.se=this.se.insert(t,l)}}}}}Ie(e){const t=e.M.unchangedNames;if(!t||!t.bits)return null;const{bits:{bitmap:n="",padding:s=0},hashCount:i=0}=t;let o,a;try{o=Nn(n).toUint8Array()}catch(c){if(c instanceof km)return Yt("Decoding the base64 bloom filter in existence filter failed ("+c.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw c}try{a=new Bh(o,s,i)}catch(c){return Yt(c instanceof ao?"BloomFilter error: ":"Applying bloom filter failed: ",c),null}return a.p===0?null:a}Re(e,t,n){return t.M.count===n-this.de(e,t.targetId)?0:2}de(e,t){const n=this.X.getRemoteKeysForTarget(t);let s=0;return n.forEach((i=>{const o=this.X.Ve(),a=`projects/${o.projectId}/databases/${o.database}/documents/${i.path.canonicalString()}`;e.mightContain(a)||(this.ae(t,i,null),s++)})),s}fe(e){const t=new Map;this.ee.forEach(((i,o)=>{const a=this.Te(o);if(a){if(i.current&&this.Ee(a.target)){const c=Dn(a.target)?le.fromString(a.target.getPipelineDocuments()[0]):a.target.path,l=new K(c);this.me(l).has(o)||this.pe(o,l)||this.ae(o,l,Ae.newNoDocument(l,e))}i.$&&(t.set(o,i.W()),i.G())}}));let n=ae();this.ie.forEach(((i,o)=>{let a=!0;o.forEachWhile((c=>{const l=this.Te(c);return!l||l.purpose==="TargetPurposeLimboResolution"||(a=!1,!1)})),a&&(n=n.add(i))})),this.te.forEach(((i,o)=>o.setReadTime(e))),this.re.forEach(((i,o)=>o.setReadTime(e)));const s=new yi(e,t,this.se,this.te,this.re,n);return this.te=Me(),this.ne=ja(),this.re=Me(),this.ie=ja(),this.se=new Ie(ie),s}oe(e,t){const n=this.ee.get(e);if(!n||!this.ce(e))return void G(Wi,`addDocumentToTarget received document for unknown inactive target (${e})`);const s=this.pe(e,t.key)?2:0;n.j(t.key,s),Dn(this.Te(e).target)&&this.Te(e).target.getPipelineFlavor()!=="exact"?this.re=this.re.insert(t.key,t):this.te=this.te.insert(t.key,t),this.ne=this.ne.insert(t.key,this.me(t.key).add(e)),this.ie=this.ie.insert(t.key,this.ge(t.key).add(e))}ae(e,t,n){const s=this.ee.get(e);s&&this.ce(e)?(this.pe(e,t)?s.j(t,1):s.H(t),this.ie=this.ie.insert(t,this.ge(t).delete(e)),this.ie=this.ie.insert(t,this.ge(t).add(e)),n&&(Dn(this.Te(e).target)&&this.Te(e).target.getPipelineFlavor()!=="exact"?this.re=this.re.insert(t,n):this.te=this.te.insert(t,n))):G(Wi,`removeDocumentFromTarget received document for unknown or inactive target (${e})`)}removeTarget(e){this.ee.delete(e)}Pe(e){const t=this.ee.get(e);if(!t)return 0;const n=t.W();return this.X.getRemoteKeysForTarget(e).size+n.addedDocuments.size-n.removedDocuments.size}J(e){let t=this.ee.get(e);t||(G(Wi,`recordPendingTargetRequest set up tracking for target ID ${e}`),t=new sC(e),this.ee.set(e,t)),t.J()}ge(e){let t=this.ie.get(e);return t||(t=new me(ie),this.ie=this.ie.insert(e,t)),t}me(e){let t=this.ne.get(e);return t||(t=new me(ie),this.ne=this.ne.insert(e,t)),t}ce(e){const t=this.Te(e)!==null;return t||G(Wi,"Detected inactive target",e),t}Te(e){const t=this.ee.get(e);return t===void 0||t.q?null:this.X.ye(e)}le(e){this.ee.set(e,new sC(e)),this.X.getRemoteKeysForTarget(e).forEach((t=>{this.ae(e,t,null)}))}pe(e,t){return this.X.getRemoteKeysForTarget(e).has(t)}}function ja(){return new Ie(K.comparator)}function iC(){return new Ie(K.comparator)}const yA={asc:"ASCENDING",desc:"DESCENDING"},TA={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},wA={and:"AND",or:"OR"};class AA{constructor(e,t){this.databaseId=e,this.useProto3Json=t}}function hB(r,e){return r.useProto3Json||ia(e)?e:{value:e}}function ts(r,e){return r.useProto3Json?`${new Date(1e3*e.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+e.nanoseconds).slice(-9)}Z`:{seconds:""+e.seconds,nanos:e.nanoseconds}}function hh(r){const e=Pn(r);return new ge(e.seconds,e.nanos)}function C_(r,e){return r.useProto3Json?e.toBase64():e.toUint8Array()}function ac(r,e){return ts(r,e.toTimestamp())}function We(r){return H(!!r,49232),X.fromTimestamp(hh(r))}function fh(r,e){return fB(r,e).canonicalString()}function fB(r,e){const t=(function(s){return new le(["projects",s.projectId,"databases",s.database])})(r).child("documents");return e===void 0?t:t.child(e)}function g_(r){const e=le.fromString(r);return H(v_(e),10190,{key:e.toString()}),e}function ci(r,e){return fh(r.databaseId,e.path)}function An(r,e){const t=g_(e);if(t.get(1)!==r.databaseId.projectId)throw new U(O.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+t.get(1)+" vs "+r.databaseId.projectId);if(t.get(3)!==r.databaseId.database)throw new U(O.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+t.get(3)+" vs "+r.databaseId.database);return new K(E_(t))}function m_(r,e){return fh(r.databaseId,e)}function __(r){const e=g_(r);return e.length===4?le.emptyPath():E_(e)}function dB(r){return new le(["projects",r.databaseId.projectId,"databases",r.databaseId.database]).canonicalString()}function E_(r){return H(r.length>4&&r.get(4)==="documents",29091,{key:r.toString()}),r.popFirst(5)}function oC(r,e,t){return{name:ci(r,e),fields:t.value.mapValue.fields}}function vA(r,e,t){const n=An(r,e.name),s=We(e.updateTime),i=e.createTime?We(e.createTime):X.min(),o=new ze({mapValue:{fields:e.fields}}),a=Ae.newFoundDocument(n,s,i,o);return t&&a.setHasCommittedMutations(),t?a.setHasCommittedMutations():a}function RA(r,e){return"found"in e?(function(n,s){H(!!s.found,43571),s.found.name,s.found.updateTime;const i=An(n,s.found.name),o=We(s.found.updateTime),a=s.found.createTime?We(s.found.createTime):X.min(),c=new ze({mapValue:{fields:s.found.fields}});return Ae.newFoundDocument(i,o,a,c)})(r,e):"missing"in e?(function(n,s){H(!!s.missing,3894),H(!!s.readTime,22933);const i=An(n,s.missing),o=We(s.readTime);return Ae.newNoDocument(i,o)})(r,e):z(7234,{result:e})}function bA(r,e){let t;if("targetChange"in e){e.targetChange;const n=(function(l){return l==="NO_CHANGE"?0:l==="ADD"?1:l==="REMOVE"?2:l==="CURRENT"?3:l==="RESET"?4:z(39313,{state:l})})(e.targetChange.targetChangeType||"NO_CHANGE"),s=e.targetChange.targetIds||[],i=(function(l,B){return l.useProto3Json?(H(B===void 0||typeof B=="string",58123),be.fromBase64String(B||"")):(H(B===void 0||B instanceof Buffer||B instanceof Uint8Array,16193),be.fromUint8Array(B||new Uint8Array))})(r,e.targetChange.resumeToken),o=e.targetChange.cause,a=o&&(function(l){const B=l.code===void 0?O.UNKNOWN:l_(l.code);return new U(B,l.message||"")})(o);t=new p_(n,s,i,a||null)}else if("documentChange"in e){e.documentChange;const n=e.documentChange;n.document,n.document.name,n.document.updateTime;const s=An(r,n.document.name),i=We(n.document.updateTime),o=n.document.createTime?We(n.document.createTime):X.min(),a=new ze({mapValue:{fields:n.document.fields}}),c=Ae.newFoundDocument(s,i,o,a),l=n.targetIds||[],B=n.removedTargetIds||[];t=new oc(l,B,c.key,c)}else if("documentDelete"in e){e.documentDelete;const n=e.documentDelete;n.document;const s=An(r,n.document),i=n.readTime?We(n.readTime):X.min(),o=Ae.newNoDocument(s,i),a=n.removedTargetIds||[];t=new oc([],a,o.key,o)}else if("documentRemove"in e){e.documentRemove;const n=e.documentRemove;n.document;const s=An(r,n.document),i=n.removedTargetIds||[];t=new oc([],i,s,null)}else{if(!("filter"in e))return z(11601,{we:e});{e.filter;const n=e.filter;n.targetId;const{count:s=0,unchangedNames:i}=n,o=new pA(s,i),a=n.targetId;t=new d_(a,o)}}return t}function xo(r,e){let t;if(e instanceof Ei)t={update:oC(r,e.key,e.value)};else if(e instanceof Ii)t={delete:ci(r,e.key)};else if(e instanceof Mn)t={update:oC(r,e.key,e.data),updateMask:LA(e.fieldMask)};else{if(!(e instanceof sh))return z(16599,{be:e.type});t={verify:ci(r,e.key)}}return e.fieldTransforms.length>0&&(t.updateTransforms=e.fieldTransforms.map((n=>(function(i,o){const a=o.transform;if(a instanceof ni)return{fieldPath:o.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(a instanceof ri)return{fieldPath:o.field.canonicalString(),appendMissingElements:{values:a.elements}};if(a instanceof si)return{fieldPath:o.field.canonicalString(),removeAllFromArray:{values:a.elements}};if(a instanceof fs)return{fieldPath:o.field.canonicalString(),increment:a.h};if(a instanceof Oo)return{fieldPath:o.field.canonicalString(),minimum:a.h};if(a instanceof Fo)return{fieldPath:o.field.canonicalString(),maximum:a.h};throw z(20930,{transform:o.transform})})(0,n)))),e.precondition.isNone||(t.currentDocument=(function(s,i){return i.updateTime!==void 0?{updateTime:ac(s,i.updateTime)}:i.exists!==void 0?{exists:i.exists}:z(27497)})(r,e.precondition)),t}function pB(r,e){const t=e.currentDocument?(function(i){return i.updateTime!==void 0?ve.updateTime(We(i.updateTime)):i.exists!==void 0?ve.exists(i.exists):ve.none()})(e.currentDocument):ve.none(),n=e.updateTransforms?e.updateTransforms.map((s=>(function(o,a){let c=null;if("setToServerValue"in a)H(a.setToServerValue==="REQUEST_TIME",16630,{proto:a}),c=new ni;else if("appendMissingElements"in a){const B=a.appendMissingElements.values||[];c=new ri(B)}else if("removeAllFromArray"in a){const B=a.removeAllFromArray.values||[];c=new si(B)}else"increment"in a?c=new fs(o,a.increment):"minimum"in a?c=new Oo(o,a.minimum):"maximum"in a?c=new Fo(o,a.maximum):z(16584,{proto:a});const l=Ge.fromServerFormat(a.fieldPath);return new rh(l,c)})(r,s))):[];if(e.update){e.update.name;const s=An(r,e.update.name),i=new ze({mapValue:{fields:e.update.fields}});if(e.updateMask){const o=(function(c){const l=c.fieldPaths||[];return new _t(l.map((B=>Ge.fromServerFormat(B))))})(e.updateMask);return new Mn(s,i,o,t,n)}return new Ei(s,i,t,n)}if(e.delete){const s=An(r,e.delete);return new Ii(s,t)}if(e.verify){const s=An(r,e.verify);return new sh(s,t)}return z(1463,{proto:e})}function SA(r,e){return r&&r.length>0?(H(e!==void 0,14353),r.map((t=>(function(s,i){let o=s.updateTime?We(s.updateTime):We(i);return o.isEqual(X.min())&&(o=We(i)),new Zw(o,s.transformResults||[])})(t,e)))):[]}function I_(r,e){return{documents:[m_(r,e.path)]}}function D_(r,e){const t={structuredQuery:{}},n=e.path;let s;e.collectionGroup!==null?(s=n,t.structuredQuery.from=[{collectionId:e.collectionGroup,allDescendants:!0}]):(s=n.popLast(),t.structuredQuery.from=[{collectionId:n.lastSegment()}]),t.parent=m_(r,s);const i=(function(l){if(l.length!==0)return A_(_e.create(l,"and"))})(e.filters);i&&(t.structuredQuery.where=i);const o=(function(l){if(l.length!==0)return l.map((B=>(function(p){return{field:Us(p.field),direction:NA(p.dir)}})(B)))})(e.orderBy);o&&(t.structuredQuery.orderBy=o);const a=hB(r,e.limit);return a!==null&&(t.structuredQuery.limit=a),e.startAt&&(t.structuredQuery.startAt=(function(l){return{before:l.inclusive,values:l.position}})(e.startAt)),e.endAt&&(t.structuredQuery.endAt=(function(l){return{before:!l.inclusive,values:l.position}})(e.endAt)),{Se:t,parent:s}}function y_(r){let e=__(r.parent);const t=r.structuredQuery,n=t.from?t.from.length:0;let s=null;if(n>0){H(n===1,65062);const B=t.from[0];B.allDescendants?s=B.collectionId:e=e.child(B.collectionId)}let i=[];t.where&&(i=(function(f){const p=w_(f);return p instanceof _e&&ih(p)?p.getFilters():[p]})(t.where));let o=[];t.orderBy&&(o=(function(f){return f.map((p=>(function(y){return new Lo(Hs(y.field),(function(V){switch(V){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}})(y.direction))})(p)))})(t.orderBy));let a=null;t.limit&&(a=(function(f){let p;return p=typeof f=="object"?f.value:f,ia(p)?null:p})(t.limit));let c=null;t.startAt&&(c=(function(f){const p=!!f.before,m=f.values||[];return new ii(m,p)})(t.startAt));let l=null;return t.endAt&&(l=(function(f){const p=!f.before,m=f.values||[];return new ii(m,p)})(t.endAt)),a_(e,s,o,i,a,"F",c,l)}function PA(r,e){const t=(function(s){switch(s){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return z(28987,{purpose:s})}})(e.purpose);return t==null?null:{"goog-listen-tags":t}}function T_(r,e){return{structuredPipeline:{pipeline:{stages:e.stages.map((t=>t._toProto(r)))}}}}function w_(r){return r.unaryFilter!==void 0?(function(t){switch(t.unaryFilter.op){case"IS_NAN":const n=Hs(t.unaryFilter.field);return he.create(n,"==",{doubleValue:NaN});case"IS_NULL":const s=Hs(t.unaryFilter.field);return he.create(s,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const i=Hs(t.unaryFilter.field);return he.create(i,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const o=Hs(t.unaryFilter.field);return he.create(o,"!=",{nullValue:"NULL_VALUE"});case"OPERATOR_UNSPECIFIED":return z(61313);default:return z(60726)}})(r):r.fieldFilter!==void 0?(function(t){return he.create(Hs(t.fieldFilter.field),(function(s){switch(s){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";case"OPERATOR_UNSPECIFIED":return z(58110);default:return z(50506)}})(t.fieldFilter.op),t.fieldFilter.value)})(r):r.compositeFilter!==void 0?(function(t){return _e.create(t.compositeFilter.filters.map((n=>w_(n))),(function(s){switch(s){case"AND":return"and";case"OR":return"or";default:return z(1026)}})(t.compositeFilter.op))})(r):z(30097,{filter:r})}function NA(r){return yA[r]}function OA(r){return TA[r]}function FA(r){return wA[r]}function Us(r){return{fieldPath:r.canonicalString()}}function Hs(r){return Ge.fromServerFormat(r.fieldPath)}function A_(r){return r instanceof he?(function(t){if(t.op==="=="){if(Tt(t.value))return{unaryFilter:{field:Us(t.field),op:"IS_NAN"}};if(Pt(t.value))return{unaryFilter:{field:Us(t.field),op:"IS_NULL"}}}else if(t.op==="!="){if(Tt(t.value))return{unaryFilter:{field:Us(t.field),op:"IS_NOT_NAN"}};if(Pt(t.value))return{unaryFilter:{field:Us(t.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:Us(t.field),op:OA(t.op),value:t.value}}})(r):r instanceof _e?(function(t){const n=t.getFilters().map((s=>A_(s)));return n.length===1?n[0]:{compositeFilter:{op:FA(t.op),filters:n}}})(r):z(54877,{filter:r})}function LA(r){const e=[];return r.fields.forEach((t=>e.push(t.canonicalString()))),{fieldPaths:e}}function v_(r){return r.length>=4&&r.get(0)==="projects"&&r.get(2)==="databases"}function R_(r){return!!r&&typeof r._toProto=="function"&&r._protoValueType==="ProtoValue"}function Vo(r,e){const t={fields:{}};return e.forEach(((n,s)=>{if(typeof s!="string")throw new Error(`Cannot encode map with non-string key: ${s}`);t.fields[s]=n._toProto(r)})),{mapValue:t}}function b_(r){return{stringValue:r}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function pu(r){return new AA(r,!0)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class St{constructor(e){this._byteString=e}static fromBase64String(e){try{return new St(be.fromBase64String(e))}catch(t){throw new U(O.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+t)}}static fromUint8Array(e){return new St(be.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}toJSON(){return{type:St._jsonSchemaVersion,bytes:this.toBase64()}}static fromJSON(e){if(ra(e,St._jsonSchema))return St.fromBase64String(e.bytes)}}St._jsonSchemaVersion="firestore/bytes/1.0",St._jsonSchema={type:ke("string",St._jsonSchemaVersion),bytes:ke("string")};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ti{constructor(...e){for(let t=0;t<e.length;++t)if(e[t].length===0)throw new U(O.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new Ge(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}}function kA(){return new Ti(an)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ca{constructor(e){this._methodName=e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dn{constructor(e,t){if(!isFinite(e)||e<-90||e>90)throw new U(O.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(t)||t<-180||t>180)throw new U(O.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+t);this._lat=e,this._long=t}get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}_compareTo(e){return ie(this._lat,e._lat)||ie(this._long,e._long)}toJSON(){return{latitude:this._lat,longitude:this._long,type:dn._jsonSchemaVersion}}static fromJSON(e){if(ra(e,dn._jsonSchema))return new dn(e.latitude,e.longitude)}}dn._jsonSchemaVersion="firestore/geoPoint/1.0",dn._jsonSchema={type:ke("string",dn._jsonSchemaVersion),latitude:ke("number"),longitude:ke("number")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tt{constructor(e){this.uid=e}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}}tt.UNAUTHENTICATED=new tt(null),tt.GOOGLE_CREDENTIALS=new tt("google-credentials-uid"),tt.FIRST_PARTY=new tt("first-party-uid"),tt.MOCK_USER=new tt("mock-user");/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qt{constructor(){this.promise=new Promise(((e,t)=>{this.resolve=e,this.reject=t}))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xA{constructor(e,t){this.user=t,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}}class VA{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,t){e.enqueueRetryable((()=>t(tt.UNAUTHENTICATED)))}shutdown(){}}class MA{constructor(e){this.De=e,this.currentUser=tt.UNAUTHENTICATED,this.xe=0,this.forceRefresh=!1,this.auth=null}start(e,t){H(this.Ce===void 0,42304);let n=this.xe;const s=c=>this.xe!==n?(n=this.xe,t(c)):Promise.resolve();let i=new qt;this.Ce=()=>{this.xe++,this.currentUser=this.Fe(),i.resolve(),i=new qt,e.enqueueRetryable((()=>s(this.currentUser)))};const o=()=>{const c=i;e.enqueueRetryable((async()=>{await c.promise,await s(this.currentUser)}))},a=c=>{G("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=c,this.Ce&&(this.auth.addAuthTokenListener(this.Ce),o())};this.De.onInit((c=>a(c))),setTimeout((()=>{if(!this.auth){const c=this.De.getImmediate({optional:!0});c?a(c):(G("FirebaseAuthCredentialsProvider","Auth not yet detected"),i.resolve(),i=new qt)}}),0),o()}getToken(){const e=this.xe,t=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(t).then((n=>this.xe!==e?(G("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):n?(H(typeof n.accessToken=="string",31837,{Oe:n}),new xA(n.accessToken,this.currentUser)):null)):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.Ce&&this.auth.removeAuthTokenListener(this.Ce),this.Ce=void 0}Fe(){const e=this.auth&&this.auth.getUid();return H(e===null||typeof e=="string",2055,{Me:e}),new tt(e)}}class GA{constructor(e,t,n){this.Ne=e,this.Le=t,this.Be=n,this.type="FirstParty",this.user=tt.FIRST_PARTY,this.Ue=new Map}ke(){return this.Be?this.Be():null}get headers(){this.Ue.set("X-Goog-AuthUser",this.Ne);const e=this.ke();return e&&this.Ue.set("Authorization",e),this.Le&&this.Ue.set("X-Goog-Iam-Authorization-Token",this.Le),this.Ue}}class UA{constructor(e,t,n){this.Ne=e,this.Le=t,this.Be=n}getToken(){return Promise.resolve(new GA(this.Ne,this.Le,this.Be))}start(e,t){e.enqueueRetryable((()=>t(tt.FIRST_PARTY)))}shutdown(){}invalidateToken(){}}class aC{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class HA{constructor(e,t){this.qe=t,this.forceRefresh=!1,this.appCheck=null,this.$e=null,this.Ke=null,mt(e)&&e.settings.appCheckToken&&(this.Ke=e.settings.appCheckToken)}start(e,t){H(this.Ce===void 0,3512);const n=i=>{i.error!=null&&G("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${i.error.message}`);const o=i.token!==this.$e;return this.$e=i.token,G("FirebaseAppCheckTokenProvider",`Received ${o?"new":"existing"} token.`),o?t(i.token):Promise.resolve()};this.Ce=i=>{e.enqueueRetryable((()=>n(i)))};const s=i=>{G("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=i,this.Ce&&this.appCheck.addTokenListener(this.Ce)};this.qe.onInit((i=>s(i))),setTimeout((()=>{if(!this.appCheck){const i=this.qe.getImmediate({optional:!0});i?s(i):G("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}}),0)}getToken(){if(this.Ke)return Promise.resolve(new aC(this.Ke));const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then((t=>t?(H(typeof t.token=="string",44558,{tokenResult:t}),this.$e=t.token,new aC(t.token)):null)):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.Ce&&this.appCheck.removeTokenListener(this.Ce),this.Ce=void 0}}function S_(r){const e={};return r.timeoutSeconds!==void 0&&(e.timeoutSeconds=r.timeoutSeconds),e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qA{Qe(e){}shutdown(){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const cC="ConnectivityMonitor";class uC{constructor(){this.We=()=>this.Ge(),this.ze=()=>this.je(),this.He=[],this.Je()}Qe(e){this.He.push(e)}shutdown(){window.removeEventListener("online",this.We),window.removeEventListener("offline",this.ze)}Je(){window.addEventListener("online",this.We),window.addEventListener("offline",this.ze)}Ge(){G(cC,"Network connectivity changed: AVAILABLE");for(const e of this.He)e(0)}je(){G(cC,"Network connectivity changed: UNAVAILABLE");for(const e of this.He)e(1)}static Ye(){return typeof window<"u"&&window.addEventListener!==void 0&&window.removeEventListener!==void 0}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Ka=null;function CB(){return Ka===null?Ka=(function(){return 268435456+Math.round(2147483648*Math.random())})():Ka++,"0x"+Ka.toString(16)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const wl="RestConnection",jA={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery",ExecutePipeline:"executePipeline"};class KA{get Ze(){return!1}constructor(e){this.databaseInfo=e,this.databaseId=e.databaseId;const t=e.ssl?"https":"http",n=encodeURIComponent(this.databaseId.projectId),s=encodeURIComponent(this.databaseId.database);this.Xe=t+"://"+e.host,this.et=`projects/${n}/databases/${s}`,this.tt=this.databaseId.database===Ac?`project_id=${n}`:`project_id=${n}&database_id=${s}`}nt(e,t,n,s,i){const o=CB(),a=this.rt(e,t.toUriEncodedString());G(wl,`Sending RPC '${e}' ${o}:`,a,n);const c={"google-cloud-resource-prefix":this.et,"x-goog-request-params":this.tt};this.it(c,s,i);const{host:l}=new URL(a),B=Vn(l);return this.st(e,a,c,n,B).then((f=>(G(wl,`Received RPC '${e}' ${o}: `,f),f)),(f=>{throw Yt(wl,`RPC '${e}' ${o} failed with error: `,f,"url: ",a,"request:",n),f}))}_t(e,t,n,s,i,o){return this.nt(e,t,n,s,i)}it(e,t,n){if(e["X-Goog-Api-Client"]=(function(){return"gl-js/ fire/"+_i})(),e["Content-Type"]="text/plain",this.databaseInfo.appId&&(e["X-Firebase-GMPID"]=this.databaseInfo.appId),t&&t.headers.forEach(((s,i)=>e[i]=s)),n&&n.headers.forEach(((s,i)=>e[i]=s)),this.databaseInfo._customHeaders)for(const s of Object.keys(this.databaseInfo._customHeaders))e[s]=this.databaseInfo._customHeaders[s]}rt(e,t){const n=jA[e];let s=`${this.Xe}/v1/${t}:${n}`;return this.databaseInfo.apiKey&&(s=`${s}?key=${encodeURIComponent(this.databaseInfo.apiKey)}`),s}terminate(){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class JA{constructor(e){this.ot=e.ot,this.ut=e.ut}ct(e){this.lt=e}Et(e){this.ht=e}Tt(e){this.Pt=e}onMessage(e){this.It=e}close(){this.ut()}send(e){this.ot(e)}Rt(){this.lt()}At(){this.ht()}Vt(e){this.Pt(e)}dt(e){this.It(e)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const et="WebChannelConnection",Yi=(r,e,t)=>{r.listen(e,(n=>{try{t(n)}catch(s){setTimeout((()=>{throw s}),0)}}))};class zs extends KA{constructor(e){super(e),this.ft=[],this.forceLongPolling=e.forceLongPolling,this.autoDetectLongPolling=e.autoDetectLongPolling,this.useFetchStreams=e.useFetchStreams,this.longPollingOptions=e.longPollingOptions}static gt(){if(!zs.yt){const e=ym();Yi(e,Dm.STAT_EVENT,(t=>{t.stat===Xl.PROXY?G(et,"STAT_EVENT: detected buffering proxy"):t.stat===Xl.NOPROXY&&G(et,"STAT_EVENT: detected no buffering proxy")})),zs.yt=!0}}st(e,t,n,s,i){const o=CB();return new Promise(((a,c)=>{const l=new Em;l.setWithCredentials(!0),l.listenOnce(Im.COMPLETE,(()=>{try{switch(l.getLastErrorCode()){case nc.NO_ERROR:const f=l.getResponseJson();G(et,`XHR for RPC '${e}' ${o} received:`,JSON.stringify(f)),a(f);break;case nc.TIMEOUT:G(et,`RPC '${e}' ${o} timed out`),c(new U(O.DEADLINE_EXCEEDED,"Request time out"));break;case nc.HTTP_ERROR:const p=l.getStatus();if(G(et,`RPC '${e}' ${o} failed with status:`,p,"response text:",l.getResponseText()),p>0){let m=l.getResponseJson();Array.isArray(m)&&(m=m[0]);const y=m?.error;if(y&&y.status&&y.message){const F=(function(j){const Y=j.toLowerCase().replace(/_/g,"-");return Object.values(O).indexOf(Y)>=0?Y:O.UNKNOWN})(y.status);c(new U(F,y.message))}else c(new U(O.UNKNOWN,"Server responded with status "+l.getStatus()))}else c(new U(O.UNAVAILABLE,"Connection failed."));break;default:z(9055,{wt:e,streamId:o,bt:l.getLastErrorCode(),St:l.getLastError()})}}finally{G(et,`RPC '${e}' ${o} completed.`)}}));const B=JSON.stringify(s);G(et,`RPC '${e}' ${o} sending request:`,s),l.send(t,"POST",B,n,15)}))}vt(e,t,n){const s=CB(),i=[this.Xe,"/","google.firestore.v1.Firestore","/",e,"/channel"],o=this.createWebChannelTransport(),a={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},c=this.longPollingOptions.timeoutSeconds;c!==void 0&&(a.longPollingTimeout=Math.round(1e3*c)),this.useFetchStreams&&(a.useFetchStreams=!0),this.it(a.initMessageHeaders,t,n),a.encodeInitMessageHeaders=!0;const l=i.join("");G(et,`Creating RPC '${e}' stream ${s}: ${l}`,a);const B=o.createWebChannel(l,a);this.Dt(B);let f=!1,p=!1;const m=new JA({ot:y=>{p?G(et,`Not sending because RPC '${e}' stream ${s} is closed:`,y):(f||(G(et,`Opening RPC '${e}' stream ${s} transport.`),B.open(),f=!0),G(et,`RPC '${e}' stream ${s} sending:`,y),B.send(y))},ut:()=>B.close()});return Yi(B,io.EventType.OPEN,(()=>{p||(G(et,`RPC '${e}' stream ${s} transport opened.`),m.Rt())})),Yi(B,io.EventType.CLOSE,(()=>{p||(p=!0,G(et,`RPC '${e}' stream ${s} transport closed`),m.Vt(),this.xt(B))})),Yi(B,io.EventType.ERROR,(y=>{p||(p=!0,Yt(et,`RPC '${e}' stream ${s} transport errored. Name:`,y.name,"Message:",y.message),m.Vt(new U(O.UNAVAILABLE,"The operation could not be completed")))})),Yi(B,io.EventType.MESSAGE,(y=>{if(!p){const F=y.data[0];H(!!F,16349);const V=F,j=V?.error||V[0]?.error;if(j){G(et,`RPC '${e}' stream ${s} received error:`,j);const Y=j.status;let ee=(function(oe){const T=Le[oe];if(T!==void 0)return l_(T)})(Y),se=j.message;Y==="NOT_FOUND"&&se.includes("database")&&se.includes("does not exist")&&se.includes(this.databaseId.database)&&Yt(`Database '${this.databaseId.database}' not found. Please check your project configuration.`),ee===void 0&&(ee=O.INTERNAL,se="Unknown error status: "+Y+" with message "+j.message),p=!0,m.Vt(new U(ee,se)),B.close()}else G(et,`RPC '${e}' stream ${s} received:`,F),m.dt(F)}})),zs.gt(),setTimeout((()=>{m.At()}),0),m}terminate(){this.ft.forEach((e=>e.close())),this.ft=[]}Dt(e){this.ft.push(e)}xt(e){this.ft=this.ft.filter((t=>t===e))}it(e,t,n){super.it(e,t,n),this.databaseInfo.apiKey&&(e["x-goog-api-key"]=this.databaseInfo.apiKey)}createWebChannelTransport(){return Tm()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function zA(r){return new zs(r)}zs.yt=!1;class dh{constructor(e,t,n=1e3,s=1.5,i=6e4){this.Ct=e,this.timerId=t,this.Ft=n,this.Ot=s,this.Mt=i,this.Nt=0,this.Lt=null,this.Bt=Date.now(),this.reset()}reset(){this.Nt=0}Ut(){this.Nt=this.Mt}kt(e){this.cancel();const t=Math.floor(this.Nt+this.qt()),n=Math.max(0,Date.now()-this.Bt),s=Math.max(0,t-n);s>0&&G("ExponentialBackoff",`Backing off for ${s} ms (base delay: ${this.Nt} ms, delay with jitter: ${t} ms, last attempt: ${n} ms ago)`),this.Lt=this.Ct.enqueueAfterDelay(this.timerId,s,(()=>(this.Bt=Date.now(),e()))),this.Nt*=this.Ot,this.Nt<this.Ft&&(this.Nt=this.Ft),this.Nt>this.Mt&&(this.Nt=this.Mt)}$t(){this.Lt!==null&&(this.Lt.skipDelay(),this.Lt=null)}cancel(){this.Lt!==null&&(this.Lt.cancel(),this.Lt=null)}qt(){return(Math.random()-.5)*this.Nt}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const lC="PersistentStream";class P_{constructor(e,t,n,s,i,o,a,c){this.Ct=e,this.Kt=n,this.Qt=s,this.connection=i,this.authCredentialsProvider=o,this.appCheckCredentialsProvider=a,this.listener=c,this.state=0,this.Wt=0,this.Gt=null,this.zt=null,this.stream=null,this.jt=0,this.Ht=new dh(e,t)}Jt(){return this.state===1||this.state===5||this.Yt()}Yt(){return this.state===2||this.state===3}start(){this.jt=0,this.state!==4?this.auth():this.Zt()}async stop(){this.Jt()&&await this.close(0)}Xt(){this.state=0,this.Ht.reset()}en(){this.Yt()&&this.Gt===null&&(this.Gt=this.Ct.enqueueAfterDelay(this.Kt,6e4,(()=>this.tn())))}nn(e){this.rn(),this.stream.send(e)}async tn(){if(this.Yt())return this.close(0)}rn(){this.Gt&&(this.Gt.cancel(),this.Gt=null)}sn(){this.zt&&(this.zt.cancel(),this.zt=null)}async close(e,t){this.rn(),this.sn(),this.Ht.cancel(),this.Wt++,e!==4?this.Ht.reset():t&&t.code===O.RESOURCE_EXHAUSTED?(Fe(t.toString()),Fe("Using maximum backoff delay to prevent overloading the backend."),this.Ht.Ut()):t&&t.code===O.UNAUTHENTICATED&&this.state!==3&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),this.stream!==null&&(this._n(),this.stream.close(),this.stream=null),this.state=e,await this.listener.Tt(t)}_n(){}auth(){this.state=1;const e=this.an(this.Wt),t=this.Wt;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then((([n,s])=>{this.Wt===t&&this.un(n,s)}),(n=>{e((()=>{const s=new U(O.UNKNOWN,"Fetching auth token failed: "+n.message);return this.cn(s)}))}))}un(e,t){const n=this.an(this.Wt);this.stream=this.En(e,t),this.stream.ct((()=>{n((()=>this.listener.ct()))})),this.stream.Et((()=>{n((()=>(this.state=2,this.zt=this.Ct.enqueueAfterDelay(this.Qt,1e4,(()=>(this.Yt()&&(this.state=3),Promise.resolve()))),this.listener.Et())))})),this.stream.Tt((s=>{n((()=>this.cn(s)))})),this.stream.onMessage((s=>{n((()=>++this.jt==1?this.hn(s):this.onNext(s)))}))}Zt(){this.state=5,this.Ht.kt((async()=>{this.state=0,this.start()}))}cn(e){return G(lC,`close with error: ${e}`),this.stream=null,this.close(4,e)}an(e){return t=>{this.Ct.enqueueAndForget((()=>this.Wt===e?t():(G(lC,"stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve())))}}}class $A extends P_{constructor(e,t,n,s,i,o){super(e,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",t,n,s,o),this.serializer=i}En(e,t){return this.connection.vt("Listen",e,t)}hn(e){return this.onNext(e)}onNext(e){this.Ht.reset();const t=bA(this.serializer,e),n=(function(i){if(!("targetChange"in i))return X.min();const o=i.targetChange;return o.targetIds&&o.targetIds.length?X.min():o.readTime?We(o.readTime):X.min()})(e);return this.listener.Tn(t,n)}Pn(e){const t={};t.database=dB(this.serializer),t.addTarget=(function(i,o){let a;const c=o.target;if(a=Dn(c)?{pipelineQuery:T_(i,c)}:ch(c)?{documents:I_(i,c)}:{query:D_(i,c).Se},a.targetId=o.targetId,o.resumeToken.approximateByteSize()>0){a.resumeToken=C_(i,o.resumeToken);const l=hB(i,o.expectedCount);l!==null&&(a.expectedCount=l)}else if(o.snapshotVersion.compareTo(X.min())>0){a.readTime=ts(i,o.snapshotVersion.toTimestamp());const l=hB(i,o.expectedCount);l!==null&&(a.expectedCount=l)}return a})(this.serializer,e);const n=PA(this.serializer,e);n&&(t.labels=n),this.nn(t)}In(e){const t={};t.database=dB(this.serializer),t.removeTarget=e,this.nn(t)}}class QA extends P_{constructor(e,t,n,s,i,o){super(e,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",t,n,s,o),this.serializer=i}get Rn(){return this.jt>0}start(){this.lastStreamToken=void 0,super.start()}_n(){this.Rn&&this.An([])}En(e,t){return this.connection.vt("Write",e,t)}hn(e){return H(!!e.streamToken,31322),this.lastStreamToken=e.streamToken,H(!e.writeResults||e.writeResults.length===0,55816),this.listener.Vn()}onNext(e){H(!!e.streamToken,12678),this.lastStreamToken=e.streamToken,this.Ht.reset();const t=SA(e.writeResults,e.commitTime),n=We(e.commitTime);return this.listener.dn(n,t)}fn(){const e={};e.database=dB(this.serializer),this.nn(e)}An(e){const t={streamToken:this.lastStreamToken,writes:e.map((n=>xo(this.serializer,n)))};this.nn(t)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class WA{}class YA extends WA{constructor(e,t,n,s){super(),this.authCredentials=e,this.appCheckCredentials=t,this.connection=n,this.serializer=s,this.mn=!1}pn(){if(this.mn)throw new U(O.FAILED_PRECONDITION,"The client has already been terminated.")}nt(e,t,n,s){return this.pn(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then((([i,o])=>this.connection.nt(e,fB(t,n),s,i,o))).catch((i=>{throw i.name==="FirebaseError"?(i.code===O.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),i):new U(O.UNKNOWN,i.toString())}))}_t(e,t,n,s,i){return this.pn(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then((([o,a])=>this.connection._t(e,fB(t,n),s,o,a,i))).catch((o=>{throw o.name==="FirebaseError"?(o.code===O.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),o):new U(O.UNKNOWN,o.toString())}))}terminate(){this.mn=!0,this.connection.terminate()}}function XA(r,e,t,n){return new YA(r,e,t,n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ZA="ComponentProvider",BC=new Map;function ev(r,e,t,n,s){return new Kw(r,e,t,s.host,s.ssl,s.experimentalForceLongPolling,s.experimentalAutoDetectLongPolling,S_(s.experimentalLongPollingOptions),s.useFetchStreams,s.isUsingEmulator,n,s._customHeaders,s.grpcFlowControlWindow)}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const hC={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0},N_=41943040;class nt{static withCacheSize(e){return new nt(e,nt.DEFAULT_COLLECTION_PERCENTILE,nt.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)}constructor(e,t,n){this.cacheSizeCollectionThreshold=e,this.percentileToCollect=t,this.maximumSequenceNumbersToCollect=n}}nt.DEFAULT_COLLECTION_PERCENTILE=10,nt.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,nt.DEFAULT=new nt(N_,nt.DEFAULT_COLLECTION_PERCENTILE,nt.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),nt.DISABLED=new nt(-1,0,0);/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Et{constructor(e,t){this.previousValue=e,t&&(t.sequenceNumberHandler=n=>this.gn(n),this.yn=n=>t.writeSequenceNumber(n))}gn(e){return this.previousValue=Math.max(e,this.previousValue),this.previousValue}next(){const e=++this.previousValue;return this.yn&&this.yn(e),e}}Et.wn=-1;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const O_="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class F_{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(e){this.onCommittedListeners.push(e)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach((e=>e()))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function br(r){if(r.code!==O.FAILED_PRECONDITION||r.message!==O_)throw r;G("LocalStore","Unexpectedly lost primary lease")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class b{constructor(e){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,e((t=>{this.isDone=!0,this.result=t,this.nextCallback&&this.nextCallback(t)}),(t=>{this.isDone=!0,this.error=t,this.catchCallback&&this.catchCallback(t)}))}catch(e){return this.next(void 0,e)}next(e,t){return this.callbackAttached&&z(59440),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(t,this.error):this.wrapSuccess(e,this.result):new b(((n,s)=>{this.nextCallback=i=>{this.wrapSuccess(e,i).next(n,s)},this.catchCallback=i=>{this.wrapFailure(t,i).next(n,s)}}))}toPromise(){return new Promise(((e,t)=>{this.next(e,t)}))}wrapUserFunction(e){try{const t=e();return t instanceof b?t:b.resolve(t)}catch(t){return b.reject(t)}}wrapSuccess(e,t){return e?this.wrapUserFunction((()=>e(t))):b.resolve(t)}wrapFailure(e,t){return e?this.wrapUserFunction((()=>e(t))):b.reject(t)}static resolve(e){return new b(((t,n)=>{t(e)}))}static reject(e){return new b(((t,n)=>{n(e)}))}static waitFor(e){return new b(((t,n)=>{let s=0,i=0,o=!1;e.forEach((a=>{++s,a.next((()=>{++i,o&&i===s&&t()}),(c=>n(c)))})),o=!0,i===s&&t()}))}static or(e){let t=b.resolve(!1);for(const n of e)t=t.next((s=>s?b.resolve(s):n()));return t}static forEach(e,t){const n=[];return e.forEach(((s,i)=>{n.push(t.call(this,s,i))})),this.waitFor(n)}static mapArray(e,t){return new b(((n,s)=>{const i=e.length,o=new Array(i);let a=0;for(let c=0;c<i;c++){const l=c;t(e[l]).next((B=>{o[l]=B,++a,a===i&&n(o)}),(B=>s(B)))}}))}static doWhile(e,t){return new b(((n,s)=>{const i=()=>{e()===!0?t().next((()=>{i()}),s):n()};i()}))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const bt="SimpleDb";class Cu{static open(e,t,n,s){try{return new Cu(t,e.transaction(s,n))}catch(i){throw new go(t,i)}}constructor(e,t){this.action=e,this.transaction=t,this.aborted=!1,this.bn=new qt,this.transaction.oncomplete=()=>{this.bn.resolve()},this.transaction.onabort=()=>{t.error?this.bn.reject(new go(e,t.error)):this.bn.resolve()},this.transaction.onerror=n=>{const s=ph(n.target.error);this.bn.reject(new go(e,s))}}get Sn(){return this.bn.promise}abort(e){e&&this.bn.reject(e),this.aborted||(G(bt,"Aborting transaction:",e?e.message:"Client-initiated abort"),this.aborted=!0,this.transaction.abort())}vn(){const e=this.transaction;this.aborted||typeof e.commit!="function"||e.commit()}store(e){const t=this.transaction.objectStore(e);return new nv(t)}}class pn{static delete(e){return G(bt,"Removing database:",e),Kr(im().indexedDB.deleteDatabase(e)).toPromise()}static Ye(){if(!Yo())return!1;if(pn.Dn())return!0;const e=He(),t=pn.xn(e),n=0<t&&t<10,s=L_(e),i=0<s&&s<4.5;return!(e.indexOf("MSIE ")>0||e.indexOf("Trident/")>0||e.indexOf("Edge/")>0||n||i)}static Dn(){return typeof process<"u"&&process.__PRIVATE_env?.__PRIVATE_USE_MOCK_PERSISTENCE==="YES"}static Cn(e,t){return e.store(t)}static xn(e){const t=e.match(/i(?:phone|pad|pod) os ([\d_]+)/i),n=t?t[1].split("_").slice(0,2).join("."):"-1";return Number(n)}constructor(e,t,n){this.name=e,this.version=t,this.Fn=n,this.On=null,pn.xn(He())===12.2&&Fe("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.")}async Mn(e){return this.db||(G(bt,"Opening database:",this.name),this.db=await new Promise(((t,n)=>{const s=indexedDB.open(this.name,this.version);s.onsuccess=i=>{const o=i.target.result;t(o)},s.onblocked=()=>{n(new go(e,"Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."))},s.onerror=i=>{const o=i.target.error;o.name==="VersionError"?n(new U(O.FAILED_PRECONDITION,"A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")):o.name==="InvalidStateError"?n(new U(O.FAILED_PRECONDITION,"Unable to open an IndexedDB connection. This could be due to running in a private browsing session on a browser whose private browsing sessions do not support IndexedDB: "+o)):n(new go(e,o))},s.onupgradeneeded=i=>{G(bt,'Database "'+this.name+'" requires upgrade from version:',i.oldVersion);const o=i.target.result;this.Fn.Nn(o,s.transaction,i.oldVersion,this.version).next((()=>{G(bt,"Database upgrade to version "+this.version+" complete")}))}}))),this.Ln&&(this.db.onversionchange=t=>this.Ln(t)),this.db}Bn(e){this.Ln=e,this.db&&(this.db.onversionchange=t=>e(t))}async runTransaction(e,t,n,s){const i=t==="readonly";let o=0;for(;;){++o;try{this.db=await this.Mn(e);const a=Cu.open(this.db,e,i?"readonly":"readwrite",n),c=s(a).next((l=>(a.vn(),l))).catch((l=>(a.abort(l),b.reject(l)))).toPromise();return c.catch((()=>{})),await a.Sn,c}catch(a){const c=a,l=c.name!=="FirebaseError"&&o<3;if(G(bt,"Transaction failed with error:",c.message,"Retrying:",l),this.close(),!l)return Promise.reject(c)}}}close(){this.db&&this.db.close(),this.db=void 0}}function L_(r){const e=r.match(/Android ([\d.]+)/i),t=e?e[1].split(".").slice(0,2).join("."):"-1";return Number(t)}class tv{constructor(e){this.Un=e,this.kn=!1,this.qn=null}get isDone(){return this.kn}get $n(){return this.qn}set cursor(e){this.Un=e}done(){this.kn=!0}Kn(e){this.qn=e}delete(){return Kr(this.Un.delete())}}class go extends U{constructor(e,t){super(O.UNAVAILABLE,`IndexedDB transaction '${e}' failed: ${t}`),this.name="IndexedDbTransactionError"}}function Sr(r){return r.name==="IndexedDbTransactionError"}class nv{constructor(e){this.store=e}put(e,t){let n;return t!==void 0?(G(bt,"PUT",this.store.name,e,t),n=this.store.put(t,e)):(G(bt,"PUT",this.store.name,"<auto-key>",e),n=this.store.put(e)),Kr(n)}add(e){return G(bt,"ADD",this.store.name,e,e),Kr(this.store.add(e))}get(e){return Kr(this.store.get(e)).next((t=>(t===void 0&&(t=null),G(bt,"GET",this.store.name,e,t),t)))}delete(e){return G(bt,"DELETE",this.store.name,e),Kr(this.store.delete(e))}count(){return G(bt,"COUNT",this.store.name),Kr(this.store.count())}Qn(e,t){const n=this.options(e,t),s=n.index?this.store.index(n.index):this.store;if(typeof s.getAll=="function"){const i=s.getAll(n.range);return new b(((o,a)=>{i.onerror=c=>{a(c.target.error)},i.onsuccess=c=>{o(c.target.result)}}))}{const i=this.cursor(n),o=[];return this.Wn(i,((a,c)=>{o.push(c)})).next((()=>o))}}Gn(e,t){const n=this.store.getAll(e,t===null?void 0:t);return new b(((s,i)=>{n.onerror=o=>{i(o.target.error)},n.onsuccess=o=>{s(o.target.result)}}))}zn(e,t){G(bt,"DELETE ALL",this.store.name);const n=this.options(e,t);n.jn=!1;const s=this.cursor(n);return this.Wn(s,((i,o,a)=>a.delete()))}Hn(e,t){let n;t?n=e:(n={},t=e);const s=this.cursor(n);return this.Wn(s,t)}Jn(e){const t=this.cursor({});return new b(((n,s)=>{t.onerror=i=>{const o=ph(i.target.error);s(o)},t.onsuccess=i=>{const o=i.target.result;o?e(o.primaryKey,o.value).next((a=>{a?o.continue():n()})):n()}}))}Wn(e,t){const n=[];return new b(((s,i)=>{e.onerror=o=>{i(o.target.error)},e.onsuccess=o=>{const a=o.target.result;if(!a)return void s();const c=new tv(a),l=t(a.primaryKey,a.value,c);if(l instanceof b){const B=l.catch((f=>(c.done(),b.reject(f))));n.push(B)}c.isDone?s():c.$n===null?a.continue():a.continue(c.$n)}})).next((()=>b.waitFor(n)))}options(e,t){let n;return e!==void 0&&(typeof e=="string"?n=e:t=e),{index:n,range:t}}cursor(e){let t="next";if(e.reverse&&(t="prev"),e.index){const n=this.store.index(e.index);return e.jn?n.openKeyCursor(e.range,t):n.openCursor(e.range,t)}return this.store.openCursor(e.range,t)}}function Kr(r){return new b(((e,t)=>{r.onsuccess=n=>{const s=n.target.result;e(s)},r.onerror=n=>{const s=ph(n.target.error);t(s)}}))}let fC=!1;function ph(r){const e=pn.xn(He());if(e>=12.2&&e<13){const t="An internal error was encountered in the Indexed Database server";if(r.message.indexOf(t)>=0){const n=new U("internal",`IOS_INDEXEDDB_BUG1: IndexedDb has thrown '${t}'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.`);return fC||(fC=!0,setTimeout((()=>{throw n}),0)),n}}return r}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const dC="LruGarbageCollector",k_=1048576;function pC([r,e],[t,n]){const s=ie(r,t);return s===0?ie(e,n):s}class rv{constructor(e){this.Yn=e,this.buffer=new me(pC),this.Zn=0}Xn(){return++this.Zn}er(e){const t=[e,this.Xn()];if(this.buffer.size<this.Yn)this.buffer=this.buffer.add(t);else{const n=this.buffer.last();pC(t,n)<0&&(this.buffer=this.buffer.delete(n).add(t))}}get maxValue(){return this.buffer.last()[0]}}class x_{constructor(e,t,n){this.garbageCollector=e,this.asyncQueue=t,this.localStore=n,this.tr=null}start(){this.garbageCollector.params.cacheSizeCollectionThreshold!==-1&&this.nr(6e4)}stop(){this.tr&&(this.tr.cancel(),this.tr=null)}get started(){return this.tr!==null}nr(e){G(dC,`Garbage collection scheduled in ${e}ms`),this.tr=this.asyncQueue.enqueueAfterDelay("lru_garbage_collection",e,(async()=>{this.tr=null;try{await this.localStore.collectGarbage(this.garbageCollector)}catch(t){Sr(t)?G(dC,"Ignoring IndexedDB error during garbage collection: ",t):await br(t)}await this.nr(3e5)}))}}class sv{constructor(e,t){this.rr=e,this.params=t}calculateTargetCount(e,t){return this.rr.ir(e).next((n=>Math.floor(t/100*n)))}nthSequenceNumber(e,t){if(t===0)return b.resolve(Et.wn);const n=new rv(t);return this.rr.forEachTarget(e,(s=>n.er(s.sequenceNumber))).next((()=>this.rr.sr(e,(s=>n.er(s))))).next((()=>n.maxValue))}removeTargets(e,t,n){return this.rr.removeTargets(e,t,n)}removeOrphanedDocuments(e,t){return this.rr.removeOrphanedDocuments(e,t)}collect(e,t){return this.params.cacheSizeCollectionThreshold===-1?(G("LruGarbageCollector","Garbage collection skipped; disabled"),b.resolve(hC)):this.getCacheSize(e).next((n=>n<this.params.cacheSizeCollectionThreshold?(G("LruGarbageCollector",`Garbage collection skipped; Cache size ${n} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`),hC):this._r(e,t)))}getCacheSize(e){return this.rr.getCacheSize(e)}_r(e,t){let n,s,i,o,a,c,l;const B=Date.now();return this.calculateTargetCount(e,this.params.percentileToCollect).next((f=>(f>this.params.maximumSequenceNumbersToCollect?(G("LruGarbageCollector",`Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${f}`),s=this.params.maximumSequenceNumbersToCollect):s=f,o=Date.now(),this.nthSequenceNumber(e,s)))).next((f=>(n=f,a=Date.now(),this.removeTargets(e,n,t)))).next((f=>(i=f,c=Date.now(),this.removeOrphanedDocuments(e,n)))).next((f=>(l=Date.now(),Ms()<=Be.DEBUG&&G("LruGarbageCollector",`LRU Garbage Collection
	Counted targets in ${o-B}ms
	Determined least recently used ${s} in `+(a-o)+`ms
	Removed ${i} targets in `+(c-a)+`ms
	Removed ${f} documents in `+(l-c)+`ms
Total Duration: ${l-B}ms`),b.resolve({didRun:!0,sequenceNumbersCollected:s,targetsRemoved:i,documentsRemoved:f}))))}}function V_(r,e){return new sv(r,e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const iv="firestore.googleapis.com",CC=!0;class gC{constructor(e){if(e.host===void 0){if(e.ssl!==void 0)throw new U(O.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host=iv,this.ssl=CC}else this.host=e.host,this.ssl=e.ssl??CC;if(this.isUsingEmulator=e.emulatorOptions!==void 0,this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e._customHeaders&&(this._customHeaders={...e._customHeaders}),e.cacheSizeBytes===void 0)this.cacheSizeBytes=N_;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<k_)throw new U(O.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}if(Hw("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=S_(e.experimentalLongPollingOptions??{}),(function(n){if(n.timeoutSeconds!==void 0){if(isNaN(n.timeoutSeconds))throw new U(O.INVALID_ARGUMENT,`invalid long polling timeout: ${n.timeoutSeconds} (must not be NaN)`);if(n.timeoutSeconds<5)throw new U(O.INVALID_ARGUMENT,`invalid long polling timeout: ${n.timeoutSeconds} (minimum allowed value is 5)`);if(n.timeoutSeconds>30)throw new U(O.INVALID_ARGUMENT,`invalid long polling timeout: ${n.timeoutSeconds} (maximum allowed value is 30)`)}})(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams,e.grpcFlowControlWindow!==void 0){if(typeof e.grpcFlowControlWindow!="number"||e.grpcFlowControlWindow<=0||e.grpcFlowControlWindow>2147483647||!Number.isInteger(e.grpcFlowControlWindow))throw new U(O.INVALID_ARGUMENT,"grpcFlowControlWindow must be a positive integer and cannot exceed 2147483647");this.grpcFlowControlWindow=e.grpcFlowControlWindow}}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&(function(n,s){return n.timeoutSeconds===s.timeoutSeconds})(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams&&this.grpcFlowControlWindow===e.grpcFlowControlWindow&&(function(n,s){if(n===s)return!0;if(!n||!s)return!1;const i=Object.keys(n),o=Object.keys(s);if(i.length!==o.length)return!1;for(const a of i)if(n[a]!==s[a])return!1;return!0})(this._customHeaders,e._customHeaders)}}let Ch=class{constructor(e,t,n,s){this._authCredentials=e,this._appCheckCredentials=t,this._databaseId=n,this._app=s,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new gC({}),this._settingsFrozen=!1,this._emulatorOptions={},this._terminateTask="notTerminated"}get app(){if(!this._app)throw new U(O.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(e){if(this._settingsFrozen)throw new U(O.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new gC(e),this._emulatorOptions=e.emulatorOptions||{},e.credentials!==void 0&&(this._authCredentials=(function(n){if(!n)return new VA;switch(n.type){case"firstParty":return new UA(n.sessionIndex||"0",n.iamToken||null,n.authTokenFactory||null);case"provider":return n.client;default:throw new U(O.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}})(e.credentials))}_getSettings(){return this._settings}_getEmulatorOptions(){return this._emulatorOptions}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return(function(t){const n=BC.get(t);n&&(G(ZA,"Removing Datastore"),BC.delete(t),n.terminate())})(this),Promise.resolve()}};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Un{constructor(e,t,n){this.converter=t,this._query=n,this.type="query",this.firestore=e}withConverter(e){return new Un(this.firestore,e,this._query)}}class Re{constructor(e,t,n){this.converter=t,this._key=n,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new fr(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new Re(this.firestore,e,this._key)}toJSON(){return{type:Re._jsonSchemaVersion,referencePath:this._key.toString()}}static fromJSON(e,t,n){if(ra(t,Re._jsonSchema))return new Re(e,n||null,new K(le.fromString(t.referencePath)))}}Re._jsonSchemaVersion="firestore/documentReference/1.0",Re._jsonSchema={type:ke("string",Re._jsonSchemaVersion),referencePath:ke("string")};class fr extends Un{constructor(e,t,n){super(e,t,oa(n)),this._path=n,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const e=this._path.popLast();return e.isEmpty()?null:new Re(this.firestore,null,new K(e))}withConverter(e){return new fr(this.firestore,e,this._path)}}function kk(r,e,...t){if(r=ce(r),Lm("collection","path",e),r instanceof Ch){const n=le.fromString(e,...t);return Gp(n),new fr(r,null,n)}{if(!(r instanceof Re||r instanceof fr))throw new U(O.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const n=r._path.child(le.fromString(e,...t));return Gp(n),new fr(r.firestore,null,n)}}function ov(r,e,...t){if(r=ce(r),arguments.length===1&&(e=XB.newId()),Lm("doc","path",e),r instanceof Ch){const n=le.fromString(e,...t);return Mp(n),new Re(r,null,new K(n))}{if(!(r instanceof Re||r instanceof fr))throw new U(O.INVALID_ARGUMENT,"Expected first argument to doc() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const n=r._path.child(le.fromString(e,...t));return Mp(n),new Re(r.firestore,r instanceof fr?r.converter:null,new K(n))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Cn=class cc{constructor(e){this._values=(e||[]).map((t=>t))}toArray(){return this._values.map((e=>e))}isEqual(e){return(function(n,s){if(n.length!==s.length)return!1;for(let i=0;i<n.length;++i)if(n[i]!==s[i])return!1;return!0})(this._values,e._values)}toJSON(){return{type:cc._jsonSchemaVersion,vectorValues:this._values}}static fromJSON(e){if(ra(e,cc._jsonSchema)){if(Array.isArray(e.vectorValues)&&e.vectorValues.every((t=>typeof t=="number")))return new cc(e.vectorValues);throw new U(O.INVALID_ARGUMENT,"Expected 'vectorValues' field to be a number array")}}};Cn._jsonSchemaVersion="firestore/vectorValue/1.0",Cn._jsonSchema={type:ke("string",Cn._jsonSchemaVersion),vectorValues:ke("object")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const av=/^__.*__$/;class cv{constructor(e,t,n){this.data=e,this.fieldMask=t,this.fieldTransforms=n}toMutation(e,t){return this.fieldMask!==null?new Mn(e,this.data,this.fieldMask,t,this.fieldTransforms):new Ei(e,this.data,t,this.fieldTransforms)}}class M_{constructor(e,t,n){this.data=e,this.fieldMask=t,this.fieldTransforms=n}toMutation(e,t){return new Mn(e,this.data,this.fieldMask,t,this.fieldTransforms)}}function G_(r){switch(r){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw z(40011,{dataSource:r})}}class gh{constructor(e,t,n,s,i,o){this.settings=e,this.databaseId=t,this.serializer=n,this.ignoreUndefinedProperties=s,i===void 0&&this.validatePath(),this.fieldTransforms=i||[],this.fieldMask=o||[]}get path(){return this.settings.path}get dataSource(){return this.settings.dataSource}contextWith(e){return new gh({...this.settings,...e},this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}childContextForField(e){const t=this.path?.child(e),n=this.contextWith({path:t,arrayElement:!1});return n.validatePathSegment(e),n}childContextForFieldPath(e){const t=this.path?.child(e),n=this.contextWith({path:t,arrayElement:!1});return n.validatePath(),n}childContextForArray(e){return this.contextWith({path:void 0,arrayElement:!0})}createError(e){return Nc(e,this.settings.methodName,this.settings.hasConverter||!1,this.path,this.settings.targetDoc)}contains(e){return this.fieldMask.find((t=>e.isPrefixOf(t)))!==void 0||this.fieldTransforms.find((t=>e.isPrefixOf(t.field)))!==void 0}validatePath(){if(this.path)for(let e=0;e<this.path.length;e++)this.validatePathSegment(this.path.get(e))}validatePathSegment(e){if(e.length===0)throw this.createError("Document fields must not be empty");if(G_(this.dataSource)&&av.test(e))throw this.createError('Document fields cannot begin and end with "__"')}}class uv{constructor(e,t,n){this.databaseId=e,this.ignoreUndefinedProperties=t,this.serializer=n||pu(e)}createContext(e,t,n,s=!1){return new gh({dataSource:e,methodName:t,targetDoc:n,path:Ge.emptyPath(),arrayElement:!1,hasConverter:s},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function wi(r){const e=r._freezeSettings(),t=pu(r._databaseId);return new uv(r._databaseId,!!e.ignoreUndefinedProperties,t)}function gu(r,e,t,n,s,i={}){const o=r.createContext(i.merge||i.mergeFields?2:0,e,t,s);Dh("Data must be an object, but it was:",o,n);const a=U_(n,o);let c,l;if(i.merge)c=new _t(o.fieldMask),l=o.fieldTransforms;else if(i.mergeFields){const B=[];for(const f of i.mergeFields){const p=On(e,f,t);if(!o.contains(p))throw new U(O.INVALID_ARGUMENT,`Field '${p}' is specified in your field mask but missing from your input data.`);K_(B,p)||B.push(p)}c=new _t(B),l=o.fieldTransforms.filter((f=>c.covers(f.field)))}else c=null,l=o.fieldTransforms;return new cv(new ze(a),c,l)}class mu extends ca{_toFieldTransform(e){if(e.dataSource!==2)throw e.dataSource===1?e.createError(`${this._methodName}() can only appear at the top level of your update data`):e.createError(`${this._methodName}() cannot be used with set() unless you pass {merge:true}`);return e.fieldMask.push(e.path),null}isEqual(e){return e instanceof mu}}class mh extends ca{_toFieldTransform(e){return new rh(e.path,new ni)}isEqual(e){return e instanceof mh}}class _h extends ca{constructor(e,t){super(e),this.ur=t}_toFieldTransform(e){const t=new fs(e.serializer,Bu(e.serializer,this.ur));return new rh(e.path,t)}isEqual(e){return e instanceof _h&&(this.ur===e.ur||Number.isNaN(this.ur)&&Number.isNaN(e.ur))}}function Eh(r,e,t,n){const s=r.createContext(1,e,t);Dh("Data must be an object, but it was:",s,n);const i=[],o=ze.empty();Rr(n,((c,l)=>{const B=j_(e,c,t);l=ce(l);const f=s.childContextForFieldPath(B);if(l instanceof mu)i.push(B);else{const p=_r(l,f);p!=null&&(i.push(B),o.set(B,p))}}));const a=new _t(i);return new M_(o,a,s.fieldTransforms)}function Ih(r,e,t,n,s,i){const o=r.createContext(1,e,t),a=[On(e,n,t)],c=[s];if(i.length%2!=0)throw new U(O.INVALID_ARGUMENT,`Function ${e}() needs to be called with an even number of arguments that alternate between field names and values.`);for(let p=0;p<i.length;p+=2)a.push(On(e,i[p])),c.push(i[p+1]);const l=[],B=ze.empty();for(let p=a.length-1;p>=0;--p)if(!K_(l,a[p])){const m=a[p];let y=c[p];y=ce(y);const F=o.childContextForFieldPath(m);if(y instanceof mu)l.push(m);else{const V=_r(y,F);V!=null&&(l.push(m),B.set(m,V))}}const f=new _t(l);return new M_(B,f,o.fieldTransforms)}function lv(r,e,t,n=!1){return _r(t,r.createContext(n?4:3,e))}function _r(r,e,t){if(q_(r=ce(r)))return Dh("Unsupported field value:",e,r),U_(r,e);if(r instanceof ca)return(function(s,i){if(!G_(i.dataSource))throw i.createError(`${s._methodName}() can only be used with update() and set()`);if(!i.path)throw i.createError(`${s._methodName}() is not currently supported inside arrays`);const o=s._toFieldTransform(i);o&&i.fieldTransforms.push(o)})(r,e),null;if(r===void 0&&e.ignoreUndefinedProperties)return null;if(e.path&&e.fieldMask.push(e.path),r instanceof Array){if(e.settings.arrayElement&&e.dataSource!==4)throw e.createError("Nested arrays are not supported");return(function(s,i){const o=[];let a=0;for(const c of s){let l=_r(c,i.childContextForArray(a));l==null&&(l={nullValue:"NULL_VALUE"}),o.push(l),a++}return{arrayValue:{values:o}}})(r,e)}return(function(s,i,o){if((s=ce(s))===null)return{nullValue:"NULL_VALUE"};if(typeof s=="number")return Bu(i.serializer,s);if(typeof s=="boolean")return{booleanValue:s};if(typeof s=="string")return{stringValue:s};if(s instanceof Date){const a=ge.fromDate(s);return{timestampValue:ts(i.serializer,a)}}if(s instanceof ge){const a=new ge(s.seconds,1e3*Math.floor(s.nanoseconds/1e3));return{timestampValue:ts(i.serializer,a)}}if(H_(s)){const a=ge.fromInstant(s),c=new ge(a.seconds,1e3*Math.floor(a.nanoseconds/1e3));return{timestampValue:ts(i.serializer,c)}}if(s instanceof dn)return{geoPointValue:{latitude:s.latitude,longitude:s.longitude}};if(s instanceof St)return{bytesValue:C_(i.serializer,s._byteString)};if(s instanceof Re){const a=i.databaseId,c=s.firestore._databaseId;if(!c.isEqual(a))throw i.createError(`Document reference is for database ${c.projectId}/${c.database} but should be for database ${a.projectId}/${a.database}`);return{referenceValue:fh(s.firestore._databaseId||i.databaseId,s._key.path)}}if(s instanceof Cn)return(function(c,l){const B=c instanceof Cn?c.toArray():c;return{mapValue:{fields:{[ZB]:{stringValue:eh},[Bs]:{arrayValue:{values:B.map((p=>{if(typeof p!="number")throw l.createError("VectorValues must only contain numeric values.");return lu(l.serializer,p)}))}}}}}})(s,i);if(R_(s))return s._toProto(i.serializer);throw i.createError(`Unsupported field value: ${cu(s)}`)})(r,e)}function U_(r,e){const t={};return Fm(r)?e.path&&e.path.length>0&&e.fieldMask.push(e.path):Rr(r,((n,s)=>{const i=_r(s,e.childContextForField(n));i!=null&&(t[n]=i)})),{mapValue:{fields:t}}}function H_(r){if(typeof r!="object"||r===null)return!1;if(typeof Temporal<"u"&&typeof Temporal.Instant=="function"&&r instanceof Temporal.Instant)return!0;const e=r;return e[Symbol.toStringTag]==="Temporal.Instant"&&typeof e.t=="bigint"}function q_(r){return!(typeof r!="object"||r===null||r instanceof Array||r instanceof Date||r instanceof ge||r instanceof dn||r instanceof St||r instanceof Re||r instanceof ca||r instanceof Cn||H_(r)||R_(r))}function Dh(r,e,t){if(!q_(t)||!na(t)){const n=cu(t);throw n==="an object"?e.createError(r+" a custom object"):e.createError(r+" "+n)}}function On(r,e,t){if((e=ce(e))instanceof Ti)return e._internalPath;if(typeof e=="string")return j_(r,e);throw Nc("Field path arguments must be of type string or ",r,!1,void 0,t)}const Bv=new RegExp("[~\\*/\\[\\]]");function j_(r,e,t){if(e.search(Bv)>=0)throw Nc(`Invalid field path (${e}). Paths must not contain '~', '*', '/', '[', or ']'`,r,!1,void 0,t);try{return new Ti(...e.split("."))._internalPath}catch{throw Nc(`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,r,!1,void 0,t)}}function Nc(r,e,t,n,s){const i=n&&!n.isEmpty(),o=s!==void 0;let a=`Function ${e}() called with invalid data`;t&&(a+=" (via `toFirestore()`)"),a+=". ";let c="";return(i||o)&&(c+=" (found",i&&(c+=` in field ${n}`),o&&(c+=` in document ${s}`),c+=")"),new U(O.INVALID_ARGUMENT,a+r+c)}function K_(r,e){return r.some((t=>t.isEqual(e)))}function J_(r){return typeof r._readUserData=="function"}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ct{constructor(e){this.optionDefinitions=e}_getKnownOptions(e,t){const n=ze.empty();for(const s in this.optionDefinitions)if(this.optionDefinitions.hasOwnProperty(s)){const i=this.optionDefinitions[s];if(s in e){const o=e[s];let a;i.nestedOptions&&na(o)?a={mapValue:{fields:new ct(i.nestedOptions).getOptionsProto(t,o)}}:o&&(a=_r(o,t)??void 0),a&&n.set(Ge.fromServerFormat(i.serverName),a)}}return n}getOptionsProto(e,t,n){const s=this._getKnownOptions(t,e);if(n){const i=new Map(Uw(n,((o,a)=>[Ge.fromServerFormat(a),o!==void 0?_r(o,e):null])));s.setAll(i)}return s.value.mapValue.fields??{}}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function hv(r){return typeof r=="object"&&r!==null&&!!("nullValue"in r&&(r.nullValue===null||r.nullValue==="NULL_VALUE")||"booleanValue"in r&&(r.booleanValue===null||typeof r.booleanValue=="boolean")||"integerValue"in r&&(r.integerValue===null||typeof r.integerValue=="number"||typeof r.integerValue=="string")||"doubleValue"in r&&(r.doubleValue===null||typeof r.doubleValue=="number")||"timestampValue"in r&&(r.timestampValue===null||(function(t){return typeof t=="object"&&t!==null&&"seconds"in t&&(t.seconds===null||typeof t.seconds=="number"||typeof t.seconds=="string")&&"nanos"in t&&(t.nanos===null||typeof t.nanos=="number")})(r.timestampValue))||"stringValue"in r&&(r.stringValue===null||typeof r.stringValue=="string")||"bytesValue"in r&&(r.bytesValue===null||r.bytesValue instanceof Uint8Array)||"referenceValue"in r&&(r.referenceValue===null||typeof r.referenceValue=="string")||"geoPointValue"in r&&(r.geoPointValue===null||(function(t){return typeof t=="object"&&t!==null&&"latitude"in t&&(t.latitude===null||typeof t.latitude=="number")&&"longitude"in t&&(t.longitude===null||typeof t.longitude=="number")})(r.geoPointValue))||"arrayValue"in r&&(r.arrayValue===null||(function(t){return typeof t=="object"&&t!==null&&!(!("values"in t)||t.values!==null&&!Array.isArray(t.values))})(r.arrayValue))||"mapValue"in r&&(r.mapValue===null||(function(t){return typeof t=="object"&&t!==null&&!(!("fields"in t)||t.fields!==null&&!na(t.fields))})(r.mapValue))||"fieldReferenceValue"in r&&(r.fieldReferenceValue===null||typeof r.fieldReferenceValue=="string")||"functionValue"in r&&(r.functionValue===null||(function(t){return typeof t=="object"&&t!==null&&!(!("name"in t)||t.name!==null&&typeof t.name!="string"||!("args"in t)||t.args!==null&&!Array.isArray(t.args))})(r.functionValue))||"pipelineValue"in r&&(r.pipelineValue===null||(function(t){return typeof t=="object"&&t!==null&&!(!("stages"in t)||t.stages!==null&&!Array.isArray(t.stages))})(r.pipelineValue)))}function xk(){return new mh("serverTimestamp")}function Vk(r){return new _h("increment",r)}function fv(r){return new Cn(r)}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function q(r){let e;return r instanceof Ds?r:(e=na(r)?mv(r):r instanceof Array?_v(r):$_(r,void 0),e)}function Al(r){if(r instanceof Ds)return r;if(r instanceof Cn)return Mo(r);if(Array.isArray(r))return Mo(fv(r));throw new Error("Unsupported value: "+typeof r)}function yh(r){return zw(r)?uc(r):q(r)}let Ds=class{constructor(){this._protoValueType="ProtoValue"}add(e){return new x("add",[this,q(e)],"add")}asBoolean(){if(this instanceof Er)return this;if(this instanceof Ts)return new W_(this);if(this instanceof ys)return new gv(this);if(this instanceof x)return new Q_(this);throw new U("invalid-argument",`Conversion of type ${typeof this} to BooleanExpression not supported.`)}subtract(e){return new x("subtract",[this,q(e)],"subtract")}multiply(e){return new x("multiply",[this,q(e)],"multiply")}divide(e){return new x("divide",[this,q(e)],"divide")}mod(e){return new x("mod",[this,q(e)],"mod")}equal(e){return new x("equal",[this,q(e)],"equal").asBoolean()}notEqual(e){return new x("not_equal",[this,q(e)],"notEqual").asBoolean()}lessThan(e){return new x("less_than",[this,q(e)],"lessThan").asBoolean()}lessThanOrEqual(e){return new x("less_than_or_equal",[this,q(e)],"lessThanOrEqual").asBoolean()}greaterThan(e){return new x("greater_than",[this,q(e)],"greaterThan").asBoolean()}greaterThanOrEqual(e){return new x("greater_than_or_equal",[this,q(e)],"greaterThanOrEqual").asBoolean()}arrayConcat(e,...t){const n=[e,...t].map((s=>q(s)));return new x("array_concat",[this,...n],"arrayConcat")}arrayContains(e){return new x("array_contains",[this,q(e)],"arrayContains").asBoolean()}arrayContainsAll(e){const t=Array.isArray(e)?new co(e.map(q),"arrayContainsAll"):e;return new x("array_contains_all",[this,t],"arrayContainsAll").asBoolean()}arrayContainsAny(e){const t=Array.isArray(e)?new co(e.map(q),"arrayContainsAny"):e;return new x("array_contains_any",[this,t],"arrayContainsAny").asBoolean()}arrayReverse(){return new x("array_reverse",[this])}arrayLength(){return new x("array_length",[this],"arrayLength")}equalAny(e){const t=Array.isArray(e)?new co(e.map(q),"equalAny"):e;return new x("equal_any",[this,t],"equalAny").asBoolean()}notEqualAny(e){const t=Array.isArray(e)?new co(e.map(q),"notEqualAny"):e;return new x("not_equal_any",[this,t],"notEqualAny").asBoolean()}exists(){return new x("exists",[this],"exists").asBoolean()}charLength(){return new x("char_length",[this],"charLength")}like(e){return new x("like",[this,q(e)],"like").asBoolean()}regexContains(e){return new x("regex_contains",[this,q(e)],"regexContains").asBoolean()}regexFind(e){return new x("regex_find",[this,q(e)],"regexFind")}regexFindAll(e){return new x("regex_find_all",[this,q(e)],"regexFindAll")}regexMatch(e){return new x("regex_match",[this,q(e)],"regexMatch").asBoolean()}stringContains(e){return new x("string_contains",[this,q(e)],"stringContains").asBoolean()}startsWith(e){return new x("starts_with",[this,q(e)],"startsWith").asBoolean()}endsWith(e){return new x("ends_with",[this,q(e)],"endsWith").asBoolean()}toLower(){return new x("to_lower",[this],"toLower")}toUpper(){return new x("to_upper",[this],"toUpper")}trim(e){const t=[this];return e&&t.push(q(e)),new x("trim",t,"trim")}ltrim(e){const t=[this];return e&&t.push(q(e)),new x("ltrim",t,"ltrim")}rtrim(e){const t=[this];return e&&t.push(q(e)),new x("rtrim",t,"rtrim")}type(){return new x("type",[this])}isType(e){return new x("is_type",[this,Mo(e)],"isType").asBoolean()}stringConcat(e,...t){const n=[e,...t].map(q);return new x("string_concat",[this,...n],"stringConcat")}stringIndexOf(e){return new x("string_index_of",[this,q(e)],"stringIndexOf")}stringRepeat(e){return new x("string_repeat",[this,q(e)],"stringRepeat")}stringReplaceAll(e,t){return new x("string_replace_all",[this,q(e),q(t)],"stringReplaceAll")}stringReplaceOne(e,t){return new x("string_replace_one",[this,q(e),q(t)],"stringReplaceOne")}concat(e,...t){const n=[e,...t].map(q);return new x("concat",[this,...n],"concat")}reverse(){return new x("reverse",[this],"reverse")}arrayFilter(e,t){return new x("array_filter",[this,q(e),t],"arrayFilter")}arrayTransform(e,t){return new x("array_transform",[this,q(e),t],"arrayTransform")}arrayTransformWithIndex(e,t,n){return new x("array_transform",[this,q(e),q(t),n],"arrayTransformWithIndex")}arraySlice(e,t){const n=[this,q(e)];return t!==void 0&&n.push(q(t)),new x("array_slice",n,"arraySlice")}arrayFirst(){return new x("array_first",[this],"arrayFirst")}arrayFirstN(e){return new x("array_first_n",[this,q(e)],"arrayFirstN")}arrayLast(){return new x("array_last",[this],"arrayLast")}arrayLastN(e){return new x("array_last_n",[this,q(e)],"arrayLastN")}arrayMaximum(){return new x("maximum",[this],"arrayMaximum")}arrayMaximumN(e){return new x("maximum_n",[this,q(e)],"arrayMaximumN")}arrayMinimum(){return new x("minimum",[this],"arrayMinimum")}arrayMinimumN(e){return new x("minimum_n",[this,q(e)],"arrayMinimumN")}arrayIndexOf(e){return new x("array_index_of",[this,q(e),q("first")],"arrayIndexOf")}arrayLastIndexOf(e){return new x("array_index_of",[this,q(e),q("last")],"arrayLastIndexOf")}arrayIndexOfAll(e){return new x("array_index_of_all",[this,q(e)],"arrayIndexOfAll")}byteLength(){return new x("byte_length",[this],"byteLength")}ceil(){return new x("ceil",[this])}floor(){return new x("floor",[this])}abs(){return new x("abs",[this])}exp(){return new x("exp",[this])}mapGet(e){return new x("map_get",[this,Mo(e)],"mapGet")}mapSet(e,t,...n){const s=[this,q(e),q(t),...n.map(q)];return new x("map_set",s,"mapSet")}mapKeys(){return new x("map_keys",[this],"mapKeys")}mapValues(){return new x("map_values",[this],"mapValues")}mapEntries(){return new x("map_entries",[this],"mapEntries")}getField(e){return new x("get_field",[this,q(e)],"get_field")}count(){return zt._create("count",[this],"count")}sum(){return zt._create("sum",[this],"sum")}average(){return zt._create("average",[this],"average")}minimum(){return zt._create("minimum",[this],"minimum")}maximum(){return zt._create("maximum",[this],"maximum")}first(){return zt._create("first",[this],"first")}last(){return zt._create("last",[this],"last")}arrayAgg(){return zt._create("array_agg",[this],"arrayAgg")}arrayAggDistinct(){return zt._create("array_agg_distinct",[this],"arrayAggDistinct")}countDistinct(){return zt._create("count_distinct",[this],"countDistinct")}logicalMaximum(e,...t){const n=[e,...t];return new x("maximum",[this,...n.map(q)],"logicalMaximum")}logicalMinimum(e,...t){const n=[e,...t];return new x("minimum",[this,...n.map(q)],"minimum")}vectorLength(){return new x("vector_length",[this],"vectorLength")}cosineDistance(e){return new x("cosine_distance",[this,Al(e)],"cosineDistance")}dotProduct(e){return new x("dot_product",[this,Al(e)],"dotProduct")}euclideanDistance(e){return new x("euclidean_distance",[this,Al(e)],"euclideanDistance")}unixMicrosToTimestamp(){return new x("unix_micros_to_timestamp",[this],"unixMicrosToTimestamp")}timestampToUnixMicros(){return new x("timestamp_to_unix_micros",[this],"timestampToUnixMicros")}unixMillisToTimestamp(){return new x("unix_millis_to_timestamp",[this],"unixMillisToTimestamp")}timestampToUnixMillis(){return new x("timestamp_to_unix_millis",[this],"timestampToUnixMillis")}unixSecondsToTimestamp(){return new x("unix_seconds_to_timestamp",[this],"unixSecondsToTimestamp")}timestampToUnixSeconds(){return new x("timestamp_to_unix_seconds",[this],"timestampToUnixSeconds")}timestampAdd(e,t){return new x("timestamp_add",[this,q(e),q(t)],"timestampAdd")}timestampSubtract(e,t){return new x("timestamp_subtract",[this,q(e),q(t)],"timestampSubtract")}timestampDiff(e,t){return new x("timestamp_diff",[this,yh(e),q(t)],"timestampDiff")}timestampExtract(e,t){const n=[this,q(e)];return t&&n.push(q(t)),new x("timestamp_extract",n,"timestampExtract")}documentId(){return new x("document_id",[this],"documentId")}parent(){return new x("parent",[this],"parent")}substring(e,t){const n=q(e);return new x("substring",t===void 0?[this,n]:[this,n,q(t)],"substring")}arrayGet(e){return new x("array_get",[this,q(e)],"arrayGet")}isError(){return new x("is_error",[this],"isError").asBoolean()}ifError(e){const t=new x("if_error",[this,q(e)],"ifError");return e instanceof Er?t.asBoolean():t}isAbsent(){return new x("is_absent",[this],"isAbsent").asBoolean()}mapRemove(e){return new x("map_remove",[this,q(e)],"mapRemove")}mapMerge(e,...t){const n=q(e),s=t.map(q);return new x("map_merge",[this,n,...s],"mapMerge")}pow(e){return new x("pow",[this,q(e)])}trunc(e){return e===void 0?new x("trunc",[this]):new x("trunc",[this,q(e)],"trunc")}round(e){return e===void 0?new x("round",[this]):new x("round",[this,q(e)],"round")}collectionId(){return new x("collection_id",[this])}length(){return new x("length",[this])}ln(){return new x("ln",[this])}sqrt(){return new x("sqrt",[this])}stringReverse(){return new x("string_reverse",[this])}ifAbsent(e){return new x("if_absent",[this,q(e)],"ifAbsent")}ifNull(e){return new x("if_null",[this,q(e)],"ifNull")}coalesce(e,...t){return new x("coalesce",[this,q(e),...t.map(q)],"coalesce")}join(e){return new x("join",[this,q(e)],"join")}log10(){return new x("log10",[this])}arraySum(){return new x("sum",[this])}split(e){return new x("split",[this,q(e)])}timestampTruncate(e,t){const n=[this,q(e)];return t&&n.push(q(t)),new x("timestamp_trunc",n)}ascending(){return Ev(this)}descending(){return Iv(this)}as(e){return new pv(this,e,"as")}},zt=class z_{constructor(e,t){this.name=e,this.params=t,this.exprType="AggregateFunction",this._protoValueType="ProtoValue"}static _create(e,t,n){const s=new z_(e,t);return s._methodName=n,s}as(e){return new dv(this,e,"as")}_toProto(e){return{functionValue:{name:this.name,args:this.params.map((t=>t._toProto(e)))}}}_readUserData(e){e=this._methodName?e.contextWith({methodName:this._methodName}):e,this.params.forEach((t=>t._readUserData(e)))}};class dv{constructor(e,t,n){this.aggregate=e,this.alias=t,this._methodName=n}_readUserData(e){this.aggregate._readUserData(e)}}let pv=class{constructor(e,t,n){this.expr=e,this.alias=t,this._methodName=n,this.exprType="AliasedExpression",this.selectable=!0}_readUserData(e){this.expr._readUserData(e)}};class co extends Ds{constructor(e,t){super(),this.cr=e,this._methodName=t,this.expressionType="ListOfExpressions"}_toProto(e){return{arrayValue:{values:this.cr.map((t=>t._toProto(e)))}}}_readUserData(e){this.cr.forEach((t=>t._readUserData(e)))}}let ys=class extends Ds{constructor(e,t){super(),this.fieldPath=e,this._methodName=t,this.expressionType="Field",this.selectable=!0}get _fieldPath(){return this.fieldPath}get fieldName(){return this.fieldPath.canonicalString()}get alias(){return this.fieldName}get expr(){return this}geoDistance(e){return new x("geo_distance",[this,q(e)],"geoDistance")}_toProto(e){return{fieldReferenceValue:this.fieldPath.canonicalString()}}_readUserData(e){}};function uc(r){return Cv(r,"field")}function Cv(r,e){return new ys(typeof r=="string"?an===r?kA()._internalPath:On("field",r):r._internalPath,e)}class Ts extends Ds{constructor(e,t){super(),this.value=e,this._methodName=t,this.expressionType="Constant"}static _fromProto(e){const t=new Ts(e,void 0);return t._protoValue=e,t}_toProto(e){return H(this._protoValue!==void 0,237),this._protoValue}_getValue(){return this._protoValue}_readUserData(e){e=this._methodName?e.contextWith({methodName:this._methodName}):e,hv(this._protoValue)||(this._protoValue=_r(this.value,e))}}function Mo(r,e){return $_(r,"constant")}function $_(r,e){const t=new Ts(r,e);return typeof r=="boolean"?new W_(t):t}let x=class extends Ds{constructor(e,t,n,s){super(),this.name=e,this.params=t,this.expressionType="Function",this._optionsProto=void 0,n!==void 0&&(this._methodName=n),s!==void 0&&(this._options=s)}get _optionsUtil(){return new ct({})}_toProto(e){const t={functionValue:{name:this.name,args:this.params.map((n=>n._toProto(e)))}};return this._optionsProto&&(t.functionValue.options=this._optionsProto),t}_readUserData(e){e=this._methodName?e.contextWith({methodName:this._methodName}):e,this.params.forEach((t=>t._readUserData(e))),this._options&&(this._optionsProto=this._optionsUtil.getOptionsProto(e,this._options))}};class Er extends Ds{get _methodName(){return this._expr._methodName}countIf(){return zt._create("count_if",[this],"countIf")}not(){return new x("not",[this],"not").asBoolean()}conditional(e,t){return new x("conditional",[this,e,t],"conditional")}ifError(e){const t=q(e),n=new x("if_error",[this,t],"ifError");return t instanceof Er?n.asBoolean():n}_toProto(e){return this._expr._toProto(e)}_readUserData(e){this._expr._readUserData(e)}}class Q_ extends Er{constructor(e){super(),this._expr=e,this.expressionType="Function"}}class W_ extends Er{constructor(e){super(),this._expr=e,this.expressionType="Constant"}_getValue(){return this._expr._getValue()}}class gv extends Er{constructor(e){super(),this._expr=e,this.expressionType="Field"}}function mv(r,e){const t=[];for(const n in r)if(Object.prototype.hasOwnProperty.call(r,n)){const s=r[n];t.push(Mo(n)),t.push(q(s))}return new x("map",t,"map")}function _v(r){return(function(t,n){return new x("array",t.map((s=>q(s))),n)})(r,"array")}function Ev(r){return new Th(yh(r),"ascending","ascending")}function Iv(r){return new Th(yh(r),"descending","descending")}class Th{constructor(e,t,n){this.expr=e,this.direction=t,this._methodName=n,this._protoValueType="ProtoValue"}_toProto(e){return{mapValue:{fields:{direction:b_(this.direction),expression:this.expr._toProto(e)}}}}_readUserData(e){this.expr._readUserData(e)}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Vt{constructor(e){this.optionsProto=void 0,{rawOptions:this.rawOptions,...this.knownOptions}=e}_readUserData(e){this.optionsProto=this._optionsUtil.getOptionsProto(e,this.knownOptions,this.rawOptions)}_toProto(e){return{name:this._name,options:this.optionsProto}}}class Y_ extends Vt{get _name(){return"add_fields"}get _optionsUtil(){return new ct({})}constructor(e,t){super(t),this.fields=e}_toProto(e){return{...super._toProto(e),args:[Vo(e,this.fields)]}}_readUserData(e){super._readUserData(e),Dr(this.fields,e)}}let X_=class extends Vt{get _name(){return"aggregate"}get _optionsUtil(){return new ct({})}constructor(e,t,n){super(n),this.groups=e,this.accumulators=t}_toProto(e){return{...super._toProto(e),args:[Vo(e,this.accumulators),Vo(e,this.groups)]}}_readUserData(e){super._readUserData(e),Dr(this.groups,e),Dr(this.accumulators,e)}},Z_=class extends Vt{get _name(){return"distinct"}get _optionsUtil(){return new ct({})}constructor(e,t){super(t),this.groups=e}_toProto(e){return{...super._toProto(e),args:[Vo(e,this.groups)]}}_readUserData(e){super._readUserData(e),Dr(this.groups,e)}},ua=class extends Vt{get _name(){return"collection"}get _optionsUtil(){return new ct({forceIndex:{serverName:"force_index"}})}constructor(e,t){super(t),this.hr=e.startsWith("/")?e:"/"+e}_toProto(e){return{...super._toProto(e),args:[{referenceValue:this.hr}]}}_readUserData(e){super._readUserData(e)}},la=class extends Vt{get _name(){return"collection_group"}get _optionsUtil(){return new ct({forceIndex:{serverName:"force_index"}})}constructor(e,t){super(t),this.collectionId=e}_toProto(e){return{...super._toProto(e),args:[{referenceValue:""},{stringValue:this.collectionId}]}}_readUserData(e){super._readUserData(e)}};class _u extends Vt{get _name(){return"database"}get _optionsUtil(){return new ct({})}_toProto(e){return{...super._toProto(e)}}_readUserData(e){super._readUserData(e)}}class Eu extends Vt{get _name(){return"documents"}get _optionsUtil(){return new ct({})}constructor(e,t){if(super(t),!e||e.length===0)throw new U(O.INVALID_ARGUMENT,"Empty document paths are not allowed in DocumentsSource");const n=e.map((i=>i.startsWith("/")?i:"/"+i)),s=new Set(n);if(s.size!==n.length)throw new U(O.INVALID_ARGUMENT,"Duplicate document paths are not allowed in DocumentsSource");this.Tr=n,this.Pr=s}_toProto(e){return{...super._toProto(e),args:this.Tr.map((t=>({referenceValue:t})))}}_readUserData(e){super._readUserData(e)}}let Ba=class extends Vt{get _name(){return"where"}get _optionsUtil(){return new ct({})}constructor(e,t){super(t),this.condition=e}_toProto(e){return{...super._toProto(e),args:[this.condition._toProto(e)]}}_readUserData(e){super._readUserData(e),Dr(this.condition,e)}},Ir=class extends Vt{get _name(){return"limit"}get _optionsUtil(){return new ct({})}constructor(e,t){H(!isNaN(e)&&e!==1/0&&e!==-1/0,34860),super(t),this.limit=e}_toProto(e){return{...super._toProto(e),args:[Bu(e,this.limit)]}}},mC=class extends Vt{get _name(){return"offset"}get _optionsUtil(){return new ct({})}constructor(e,t){super(t),this.offset=e}_toProto(e){return{...super._toProto(e),args:[Bu(e,this.offset)]}}},Dv=class extends Vt{get _name(){return"select"}get _optionsUtil(){return new ct({})}constructor(e,t){super(t),this.selections=e}_toProto(e){return{...super._toProto(e),args:[Vo(e,this.selections)]}}_readUserData(e){super._readUserData(e),Dr(this.selections,e)}},un=class extends Vt{get _name(){return"sort"}get _optionsUtil(){return new ct({})}constructor(e,t){super(t),this.orderings=e}_toProto(e){return{...super._toProto(e),args:this.orderings.map((t=>t._toProto(e)))}}_readUserData(e){super._readUserData(e),Dr(this.orderings,e)}};class wh extends Vt{get _name(){return"replace_with"}get _optionsUtil(){return new ct({})}constructor(e,t){super(t),this.map=e}_toProto(e){return{...super._toProto(e),args:[this.map._toProto(e),b_(wh.Ir)]}}_readUserData(e){super._readUserData(e),Dr(this.map,e)}}wh.Ir="full_replace";function Dr(r,e){return J_(r)?r._readUserData(e):Array.isArray(r)?r.forEach((t=>t._readUserData(e))):r instanceof Map?r.forEach((t=>t._readUserData(e))):Object.values(r).forEach((t=>t._readUserData(e))),r}/**
 * @license
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mo{constructor(e,t,n,s){this._db=e,this.userDataReader=t,this._userDataWriter=n,this.stages=s}Vr(e,t){const n=this.userDataReader.createContext(3,e);return J_(t)?t._readUserData(n):Array.isArray(t)?t.forEach((s=>s._readUserData(n))):t.forEach((s=>s._readUserData(n))),t}where(e){const t=this.stages.map((n=>n));return this.Vr("where",e),t.push(new Ba(e,{})),new mo(this._db,this.userDataReader,this._userDataWriter,t)}limit(e){const t=this.stages.map((n=>n));return t.push(new Ir(e,{})),new mo(this._db,this.userDataReader,this._userDataWriter,t)}sort(e,...t){const n=this.stages.map((s=>s));return"orderings"in e?n.push(new un(this.Vr("sort",e.orderings),{})):n.push(new un(this.Vr("sort",[e,...t]),{})),new mo(this._db,this.userDataReader,this._userDataWriter,n)}dr(e){return{pipeline:{stages:this.stages.map((t=>t._toProto(e)))}}}}// Copyright 2024 Google LLC* @license
class st{constructor(e,t,n){this.serializer=e,this.stages=t,this.listenOptions=n,this.isCorePipeline=!0}getPipelineCollection(){return ha(this)}getPipelineCollectionGroup(){return Ah(this)}getPipelineCollectionId(){return eE(this)}getPipelineDocuments(){return Oc(this)}getPipelineFlavor(){return(function(t){let n="exact";return t.stages.forEach(((s,i)=>{s._name!==Z_.name&&s._name!==X_.name||(n="keyless"),s._name===Dv.name&&n==="exact"&&(n="augmented"),s._name===Y_.name&&i<t.stages.length-1&&n==="exact"&&(n="augmented")})),n})(this)}getPipelineSourceType(){return vn(this)}}function vn(r){const e=r.stages[0];return e instanceof ua||e instanceof la||e instanceof _u||e instanceof Eu?e._name:"unknown"}function ha(r){if(vn(r)==="collection")return r.stages[0].hr}function Ah(r){if(vn(r)==="collection_group")return r.stages[0].collectionId}function eE(r){switch(vn(r)){case"collection":return le.fromString(ha(r)).lastSegment();case"collection_group":return Ah(r);default:return}}function Oc(r){if(vn(r)==="documents")return r.stages[0].Tr}class w{constructor(e,t){this.type=e,this.value=t}static mr(){return new w("ERROR",void 0)}static pr(){return new w("UNSET",void 0)}static gr(){return new w("NULL",fn)}static newValue(e){return Pt(e)?new w("NULL",fn):(function(n){return!!n&&"booleanValue"in n})(e)?new w("BOOLEAN",e):cn(e)?new w("INT",e):Wr(e)?new w("DOUBLE",e):(function(n){return!!n&&"timestampValue"in n&&!!n.timestampValue})(e)?new w("TIMESTAMP",e):(function(n){return!!n&&"stringValue"in n})(e)?new w("STRING",e):(function(n){return!!n&&"bytesValue"in n})(e)?new w("BYTES",e):e.referenceValue?new w("REFERENCE",e):e.geoPointValue?new w("GEO_POINT",e):mr(e)?new w("ARRAY",e):hs(e)?new w("VECTOR",e):es(e)?new w("MAP",e):new w("ERROR",void 0)}yr(){return this.type==="ERROR"||this.type==="UNSET"}wr(){return this.type==="NULL"}}function _o(r){if(!r.yr())return r.value}function tE(r){return r instanceof Er?r._expr:r}function re(r){if((r=tE(r))instanceof ys)return new yv(r);if(r instanceof Ts)return new Tv(r);if(r instanceof co)return new wv(r);if(r instanceof x){if(r.name==="add")return new Rv(r);if(r.name==="subtract")return new bv(r);if(r.name==="multiply")return new Sv(r);if(r.name==="divide")return new Pv(r);if(r.name==="mod")return new Nv(r);if(r.name==="and")return new Ov(r);if(r.name==="equal")return new Kv(r);if(r.name==="not_equal")return new Jv(r);if(r.name==="less_than")return new zv(r);if(r.name==="less_than_or_equal")return new $v(r);if(r.name==="greater_than")return new Qv(r);if(r.name==="greater_than_or_equal")return new Wv(r);if(r.name==="array_concat")return new Yv(r);if(r.name==="array_reverse")return new Xv(r);if(r.name==="array_contains")return new Zv(r);if(r.name==="array_contains_all")return new eR(r);if(r.name==="array_contains_any")return new tR(r);if(r.name==="array_length")return new nR(r);if(r.name==="array_element")return new rR(r);if(r.name==="equal_any")return new nE(r);if(r.name==="not_equal_any")return new Lv(r);if(r.name==="is_nan")return new kv(r);if(r.name==="is_not_nan")return new xv(r);if(r.name==="is_null")return new Vv(r);if(r.name==="is_not_null")return new Mv(r);if(r.name==="is_error")return new Gv(r);if(r.name==="exists")return new Uv(r);if(r.name==="not")return new Iu(r);if(r.name==="or")return new Fv(r);if(r.name==="xor")return new vh(r);if(r.name==="conditional")return new Hv(r);if(r.name==="maximum")return new qv(r);if(r.name==="minimum")return new jv(r);if(r.name==="reverse")return new sR(r);if(r.name==="replace_first")return new iR(r);if(r.name==="replace_all")return new oR(r);if(r.name==="char_length")return new aR(r);if(r.name==="byte_length")return new cR(r);if(r.name==="like")return new uR(r);if(r.name==="regex_contains")return new lR(r);if(r.name==="regex_match")return new BR(r);if(r.name==="string_contains")return new hR(r);if(r.name==="starts_with")return new fR(r);if(r.name==="ends_with")return new dR(r);if(r.name==="to_lower")return new pR(r);if(r.name==="to_upper")return new CR(r);if(r.name==="trim")return new gR(r);if(r.name==="string_concat")return new mR(r);if(r.name==="map_get")return new _R(r);if(r.name==="cosine_distance")return new ER(r);if(r.name==="dot_product")return new IR(r);if(r.name==="euclidean_distance")return new DR(r);if(r.name==="vector_length")return new yR(r);if(r.name==="unix_micros_to_timestamp")return new RR(r);if(r.name==="timestamp_to_unix_micros")return new PR(r);if(r.name==="unix_millis_to_timestamp")return new bR(r);if(r.name==="timestamp_to_unix_millis")return new NR(r);if(r.name==="unix_seconds_to_timestamp")return new SR(r);if(r.name==="timestamp_to_unix_seconds")return new OR(r);if(r.name==="timestamp_add")return new FR(r);if(r.name==="timestamp_subtract")return new LR(r)}throw new Error(`Unknown Expr : ${r}`)}class yv{constructor(e){this.expr=e}evaluate(e,t){if(this.expr.fieldName===an)return w.newValue({referenceValue:ci(e.serializer,t.key)});if(this.expr.fieldName==="__update_time__")return w.newValue({timestampValue:ac(e.serializer,t.version)});if(this.expr.fieldName==="__create_time__")return w.newValue({timestampValue:ac(e.serializer,t.createTime)});const n=t.data.field(this.expr._fieldPath);return n?uu(n)?w.newValue((function(i,o){if(i.serverTimestampBehavior==="estimate")return{timestampValue:ac(i.serializer,X.fromTimestamp(Zs(o)))};if(i.serverTimestampBehavior==="previous"){const a=sa(o);if(a)return a}return{nullValue:"NULL_VALUE"}})(e,n)):w.newValue(n):w.pr()}}class Tv{constructor(e){this.expr=e}evaluate(e,t){return w.newValue(this.expr._getValue())}}class wv{constructor(e){this.expr=e}evaluate(e,t){const n=this.expr.cr.map((s=>re(s).evaluate(e,t)));return n.some((s=>s.yr()))?w.mr():w.newValue({arrayValue:{values:n.map((s=>s.value))}})}}function Xe(r){return Wr(r)?Number(r.doubleValue):Number(r.integerValue)}function _n(r){return BigInt(r.integerValue)}const Av=BigInt("0x7fffffffffffffff"),vv=-BigInt("0x8000000000000000");class fa{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length>=2,24778);const n=re(this.expr.params[0]).evaluate(e,t),s=re(this.expr.params[1]).evaluate(e,t);let i=this.br(n,s);for(const o of this.expr.params.slice(2)){const a=re(o).evaluate(e,t);i=this.br(i,a)}return i}br(e,t){if(e.yr()||t.yr())return w.mr();if(e.wr()||t.wr())return w.gr();const n=e.value,s=t.value;if(!Wr(n)&&!cn(n)||!Wr(s)&&!cn(s))return w.mr();if(Wr(n)||Wr(s)){const i=this.Sr(n,s);return i?w.newValue(i):w.mr()}if(cn(n)&&cn(s)){const i=this.vr(n,s);return i===void 0?w.mr():typeof i=="number"?w.newValue({doubleValue:i}):i<vv||i>Av?w.mr():w.newValue({integerValue:`${i}`})}return w.mr()}}function Fn(r,e){return xe(r)!==xe(e)?"TYPE_MISMATCH":Tt(r)||Tt(e)?"NOT_EQ":Pt(r)&&Pt(e)?"EQ":Pt(r)||Pt(e)?"NULL":mr(r)&&mr(e)?(function(n,s){if(n.values?.length!==s.values?.length)return"NOT_EQ";let i=!1;for(let o=0;o<(n.values?.length??0);o++){const a=n.values[o],c=s.values[o];switch(Fn(a,c)){case"EQ":break;case"NOT_EQ":case"TYPE_MISMATCH":return"NOT_EQ";case"NULL":i=!0;break;default:z(44609,{Dr:a,Cr:c})}}return i?"NULL":"EQ"})(r.arrayValue,e.arrayValue):hs(r)&&hs(e)||es(r)&&es(e)?(function(n,s){const i=n.fields||{},o=s.fields||{};if(wc(i)!==wc(o))return"NOT_EQ";let a=!1;for(const c in i)if(i.hasOwnProperty(c)){if(o[c]===void 0)return"NOT_EQ";switch(Fn(i[c],o[c])){case"NOT_EQ":case"TYPE_MISMATCH":return"NOT_EQ";case"NULL":a=!0}}return a?"NULL":"EQ"})(r.mapValue,e.mapValue):(function(n,s){return jt(n,s,{u:!1,i:!0,o:!0})})(r,e)?"EQ":"NOT_EQ"}class Rv extends fa{vr(e,t){return _n(e)+_n(t)}Sr(e,t){return{doubleValue:Xe(e)+Xe(t)}}}class bv extends fa{constructor(e){super(e),this.expr=e}vr(e,t){return _n(e)-_n(t)}Sr(e,t){return{doubleValue:Xe(e)-Xe(t)}}}class Sv extends fa{constructor(e){super(e),this.expr=e}vr(e,t){return _n(e)*_n(t)}Sr(e,t){return{doubleValue:Xe(e)*Xe(t)}}}class Pv extends fa{constructor(e){super(e),this.expr=e}vr(e,t){const n=_n(t);if(n!==BigInt(0))return _n(e)/n}Sr(e,t){const n=Xe(t);return n===0?{doubleValue:ei(n)?Number.NEGATIVE_INFINITY:Number.POSITIVE_INFINITY}:{doubleValue:Xe(e)/n}}}class Nv extends fa{constructor(e){super(e),this.expr=e}vr(e,t){const n=_n(t);if(n!==BigInt(0))return _n(e)%n}Sr(e,t){const n=Xe(t);if(n!==0)return{doubleValue:Xe(e)%n}}}class Ov{constructor(e){this.expr=e}evaluate(e,t){let n=!1,s=!1;for(const i of this.expr.params){const o=re(i).evaluate(e,t);switch(o.type){case"BOOLEAN":if(!o.value?.booleanValue)return w.newValue($e);break;case"NULL":s=!0;break;default:n=!0}}return n?w.mr():s?w.gr():w.newValue(yt)}}class Iu{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===1,9634);const n=re(this.expr.params[0]).evaluate(e,t);switch(n.type){case"BOOLEAN":return w.newValue({booleanValue:!n.value?.booleanValue});case"NULL":return w.gr();default:return w.mr()}}}class Fv{constructor(e){this.expr=e}evaluate(e,t){let n=!1,s=!1;for(const i of this.expr.params){const o=re(i).evaluate(e,t);switch(o.type){case"BOOLEAN":if(o.value?.booleanValue)return w.newValue(yt);break;case"NULL":s=!0;break;default:n=!0}}return n?w.mr():s?w.gr():w.newValue($e)}}class vh{constructor(e){this.expr=e}evaluate(e,t){let n=!1,s=!1;for(const i of this.expr.params){const o=re(i).evaluate(e,t);switch(o.type){case"BOOLEAN":n=vh.xor(n,!!o.value?.booleanValue);break;case"NULL":s=!0;break;default:return w.mr()}}return s?w.gr():w.newValue({booleanValue:n})}static xor(e,t){return(e||t)&&!(e&&t)}}class nE{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===2,55094);let n=!1;const s=re(this.expr.params[0]).evaluate(e,t);switch(s.type){case"NULL":n=!0;break;case"ERROR":case"UNSET":return w.mr()}const i=re(this.expr.params[1]).evaluate(e,t);switch(i.type){case"ARRAY":break;case"NULL":n=!0;break;default:return w.mr()}if(n)return w.gr();for(const o of i.value?.arrayValue?.values??[])switch(Pt(s.value)&&Pt(o)?"EQ":Fn(s.value,o)){case"EQ":return w.newValue(yt);case"NOT_EQ":case"TYPE_MISMATCH":break;case"NULL":n=!0;break;default:z(44608,{value:s.value,candidate:o})}return n?w.gr():w.newValue($e)}}class Lv{constructor(e){this.expr=e}evaluate(e,t){return new Iu(new x("not",[new x("equal_any",this.expr.params)])).evaluate(e,t)}}class kv{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===1,23322);const n=re(this.expr.params[0]).evaluate(e,t);switch(n.type){case"INT":return w.newValue($e);case"DOUBLE":return w.newValue({booleanValue:isNaN(Xe(n.value))});case"NULL":return w.gr();default:return w.mr()}}}class xv{constructor(e){this.expr=e}evaluate(e,t){return H(this.expr.params.length===1,50406),new Iu(new x("not",[new x("is_nan",this.expr.params)])).evaluate(e,t)}}class Vv{constructor(e){this.expr=e}evaluate(e,t){switch(H(this.expr.params.length===1,23123),re(this.expr.params[0]).evaluate(e,t).type){case"NULL":return w.newValue(yt);case"UNSET":case"ERROR":return w.mr();default:return w.newValue($e)}}}class Mv{constructor(e){this.expr=e}evaluate(e,t){return H(this.expr.params.length===1,23167),new Iu(new x("not",[new x("is_null",this.expr.params)])).evaluate(e,t)}}class Gv{constructor(e){this.expr=e}evaluate(e,t){return H(this.expr.params.length===1,5228),re(this.expr.params[0]).evaluate(e,t).type==="ERROR"?w.newValue(yt):w.newValue($e)}}class Uv{constructor(e){this.expr=e}evaluate(e,t){switch(H(this.expr.params.length===1,6877),re(this.expr.params[0]).evaluate(e,t).type){case"ERROR":return w.mr();case"UNSET":return w.newValue($e);default:return w.newValue(yt)}}}class Hv{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===3,11706);const n=re(this.expr.params[0]).evaluate(e,t);switch(n.type){case"BOOLEAN":return n.value?.booleanValue?re(this.expr.params[1]).evaluate(e,t):re(this.expr.params[2]).evaluate(e,t);case"NULL":return re(this.expr.params[2]).evaluate(e,t);default:return w.mr()}}}class qv{constructor(e){this.expr=e}evaluate(e,t){const n=this.expr.params.map((i=>re(i).evaluate(e,t)));let s;for(const i of n)switch(i.type){case"ERROR":case"UNSET":case"NULL":continue;default:s=s===void 0||at(i.value,s.value)>0?i:s}return s===void 0?w.gr():s}}class jv{constructor(e){this.expr=e}evaluate(e,t){const n=this.expr.params.map((i=>re(i).evaluate(e,t)));let s;for(const i of n)switch(i.type){case"ERROR":case"UNSET":case"NULL":continue;default:s=s===void 0||at(i.value,s.value)<0?i:s}return s===void 0?w.gr():s}}class Ai{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===2,31033,`${this.expr.name}() function should have exactly 2 params`);const n=re(this.expr.params[0]).evaluate(e,t);switch(n.type){case"ERROR":case"UNSET":return w.mr()}const s=re(this.expr.params[1]).evaluate(e,t);switch(s.type){case"ERROR":case"UNSET":return w.mr()}return this.Fr(n,s)}}class Kv extends Ai{constructor(e){super(e),this.expr=e}Fr(e,t){if(e.wr()&&t.wr())return w.newValue(yt);if(e.wr()||t.wr()||Tt(e.value)||Tt(t.value)||xe(e.value)!==xe(t.value))return w.newValue($e);switch(Fn(e.value,t.value)){case"EQ":return w.newValue(yt);case"NOT_EQ":return w.newValue($e);case"NULL":return w.gr();default:z(44615,{left:e,right:t})}}}class Jv extends Ai{constructor(e){super(e),this.expr=e}Fr(e,t){switch(Fn(e.value,t.value)){case"EQ":return w.newValue($e);case"NOT_EQ":case"TYPE_MISMATCH":return w.newValue(yt);case"NULL":return w.gr();default:z(44614,{left:e,right:t})}}}class zv extends Ai{constructor(e){super(e),this.expr=e}Fr(e,t){return xe(e.value)!==xe(t.value)||Tt(e.value)||Tt(t.value)?w.newValue($e):w.newValue({booleanValue:at(e.value,t.value)<0})}}class $v extends Ai{constructor(e){super(e),this.expr=e}Fr(e,t){return xe(e.value)!==xe(t.value)||Tt(e.value)||Tt(t.value)?w.newValue($e):Fn(e.value,t.value)==="EQ"?w.newValue(yt):w.newValue({booleanValue:at(e.value,t.value)<0})}}class Qv extends Ai{constructor(e){super(e),this.expr=e}Fr(e,t){return xe(e.value)!==xe(t.value)||Tt(e.value)||Tt(t.value)?w.newValue($e):w.newValue({booleanValue:at(e.value,t.value)>0})}}class Wv extends Ai{constructor(e){super(e),this.expr=e}Fr(e,t){return xe(e.value)!==xe(t.value)||Tt(e.value)||Tt(t.value)?w.newValue($e):Fn(e.value,t.value)==="EQ"?w.newValue(yt):w.newValue({booleanValue:at(e.value,t.value)>0})}}class Yv{constructor(e){this.expr=e}evaluate(e,t){throw new Error("Unimplemented")}}class Xv{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===1,216);const n=re(this.expr.params[0]).evaluate(e,t);switch(n.type){case"NULL":return w.gr();case"ARRAY":{const s=n.value.arrayValue?.values??[];return w.newValue({arrayValue:{values:[...s].reverse()}})}default:return w.mr()}}}class Zv{constructor(e){this.expr=e}evaluate(e,t){return H(this.expr.params.length===2,52884),new nE(new x("eq_any",[this.expr.params[1],this.expr.params[0]])).evaluate(e,t)}}class eR{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===2,1392);let n=!1;const s=re(this.expr.params[0]).evaluate(e,t);switch(s.type){case"ARRAY":break;case"NULL":n=!0;break;default:return w.mr()}const i=re(this.expr.params[1]).evaluate(e,t);switch(i.type){case"ARRAY":break;case"NULL":n=!0;break;default:return w.mr()}if(n)return w.gr();const o=i.value?.arrayValue?.values??[],a=s.value?.arrayValue?.values??[];for(const c of o){let l=!1;n=!1;for(const B of a){switch(Pt(c)&&Pt(B)?"EQ":Fn(c,B)){case"EQ":l=!0;break;case"NOT_EQ":case"TYPE_MISMATCH":break;case"NULL":n=!0;break;default:z(44613,{value:B,search:c})}if(l)break}if(!l)return w.newValue($e)}return w.newValue(yt)}}class tR{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===2,2680);let n=!1;const s=re(this.expr.params[0]).evaluate(e,t);switch(s.type){case"ARRAY":break;case"NULL":n=!0;break;default:return w.mr()}const i=re(this.expr.params[1]).evaluate(e,t);switch(i.type){case"ARRAY":break;case"NULL":n=!0;break;default:return w.mr()}if(n)return w.gr();const o=i.value?.arrayValue?.values??[],a=s.value?.arrayValue?.values??[];for(const c of a)for(const l of o)switch(Pt(c)&&Pt(l)?"EQ":Fn(c,l)){case"EQ":return w.newValue(yt);case"NOT_EQ":case"TYPE_MISMATCH":break;case"NULL":n=!0;break;default:z(60403,{value:c,search:l})}return n?w.gr():w.newValue($e)}}class nR{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===1,38605);const n=re(this.expr.params[0]).evaluate(e,t);switch(n.type){case"NULL":return w.gr();case"ARRAY":return w.newValue({integerValue:`${n.value?.arrayValue?.values?.length??0}`});default:return w.mr()}}}class rR{constructor(e){this.expr=e}evaluate(e,t){throw new Error("Unimplemented")}}class sR{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===1,1508);const n=re(this.expr.params[0]).evaluate(e,t);switch(n.type){case"NULL":return w.gr();case"BYTES":{const s=n.value?.bytesValue;if(typeof s=="string"){const i=be.fromBase64String(s).toUint8Array();return i.reverse(),w.newValue({bytesValue:be.fromUint8Array(i).toBase64()})}return w.newValue({bytesValue:new Uint8Array(s).reverse()})}case"STRING":{const s=n.value?.stringValue,i=new Intl.__PRIVATE_Segmenter(void 0,{granularity:"grapheme"}).segment(s),o=Array.from(i,(a=>a.segment)).reverse();return w.newValue({stringValue:o.join("")})}default:return w.mr()}}}class iR{constructor(e){this.expr=e}evaluate(e,t){throw new Error("Unimplemented")}}class oR{constructor(e){this.expr=e}evaluate(e,t){throw new Error("Unimplemented")}}class aR{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===1,19400);const n=re(this.expr.params[0]).evaluate(e,t);switch(n.type){case"NULL":return w.gr();case"STRING":{const s=(function(o){let a=0;for(let c=0;c<o.length;c++){const l=o.codePointAt(c);if(l===void 0)return;if(l<=65535)if(l>=55296&&l<=57343)if(l<=56319){const B=o.codePointAt(c+1);B!==void 0&&B>=56320&&B<=57343?(a+=1,c++):a+=1}else a+=1;else a+=1;else{if(!(l<=1114111))return;a+=1,c++}}return a})(n.value.stringValue);return s===void 0?w.mr():w.newValue({integerValue:s})}default:return w.mr()}}}class cR{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===1,8486);const n=re(this.expr.params[0]).evaluate(e,t);switch(n.type){case"BYTES":{const s=n.value?.bytesValue;return typeof s=="string"?w.newValue({integerValue:be.fromBase64String(s).toUint8Array().length}):w.newValue({integerValue:new Uint8Array(s).length})}case"STRING":{const s=(function(o){let a=0;for(let c=0;c<o.length;c++){const l=o.codePointAt(c);if(l===void 0)return;if(l>=55296&&l<=57343){if(!(l<=56319))return;{const B=o.codePointAt(c+1);if(B===void 0||!(B>=56320&&B<=57343))return;a+=4,c++}}else if(l<=127)a+=1;else if(l<=2047)a+=2;else if(l<=65535)a+=3;else{if(!(l<=1114111))return;a+=4,c++}}return a})(n.value?.stringValue);return s===void 0?w.mr():w.newValue({integerValue:s})}case"NULL":return w.gr();default:return w.mr()}}}class vi{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===2,39773,`${this.expr.name}() function should have exactly two parameters`);let n=!1;const s=re(this.expr.params[0]).evaluate(e,t);switch(s.type){case"STRING":break;case"NULL":n=!0;break;default:return w.mr()}const i=re(this.expr.params[1]).evaluate(e,t);switch(i.type){case"STRING":break;case"NULL":n=!0;break;default:return w.mr()}return n?w.gr():this.Or(s.value?.stringValue,i.value?.stringValue)}}class uR extends vi{Or(e,t){try{const n=(function(o){let a="";for(let c=0;c<o.length;c++){const l=o.charAt(c);switch(l){case"_":a+=".";break;case"%":a+=".*";break;case"\\":case".":case"*":case"?":case"+":case"^":case"$":case"|":case"(":case")":case"[":case"]":case"{":case"}":a+="\\"+l;break;default:a+=l}}return"^"+a+"$"})(t),s=WB.compile(n);return w.newValue({booleanValue:s.matches(e)})}catch(n){return Yt(`Invalid LIKE pattern converted to regex: ${t}, returning error. Error: ${n}`),w.mr()}}}class lR extends vi{Or(e,t){try{const n=WB.compile(t);return w.newValue({booleanValue:n.test(e)})}catch{return Yt(`Invalid regex pattern found in regex_contains: ${t}, returning error`),w.mr()}}}class BR extends vi{Or(e,t){try{return w.newValue({booleanValue:WB.compile(t).matches(e)})}catch{return Yt(`Invalid regex pattern found in regex_match: ${t}, returning error`),w.mr()}}}class hR extends vi{Or(e,t){return w.newValue({booleanValue:e.includes(t)})}}class fR extends vi{Or(e,t){return w.newValue({booleanValue:e.startsWith(t)})}}class dR extends vi{Or(e,t){return w.newValue({booleanValue:e.endsWith(t)})}}class pR{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===1,29079);const n=re(this.expr.params[0]).evaluate(e,t);switch(n.type){case"STRING":return w.newValue({stringValue:n.value?.stringValue?.toLowerCase()});case"NULL":return w.gr();default:return w.mr()}}}class CR{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===1,60487);const n=re(this.expr.params[0]).evaluate(e,t);switch(n.type){case"STRING":return w.newValue({stringValue:n.value?.stringValue?.toUpperCase()});case"NULL":return w.gr();default:return w.mr()}}}class gR{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===1,28544);const n=re(this.expr.params[0]).evaluate(e,t);switch(n.type){case"STRING":return w.newValue({stringValue:n.value?.stringValue?.trim()});case"NULL":return w.gr();default:return w.mr()}}}class mR{constructor(e){this.expr=e}evaluate(e,t){const n=this.expr.params.map((o=>re(o).evaluate(e,t)));let s="",i=!1;for(const o of n)switch(o.type){case"STRING":s+=o.value.stringValue;break;case"NULL":i=!0;break;default:return w.mr()}return i?w.gr():w.newValue({stringValue:s})}}class _R{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===2,4483);const n=re(this.expr.params[0]).evaluate(e,t);switch(n.type){case"UNSET":return w.pr();case"MAP":break;default:return w.mr()}const s=re(this.expr.params[1]).evaluate(e,t);if(s.type!=="STRING")return w.mr();const i=n.value?.mapValue?.fields?.[s.value?.stringValue];return i===void 0?w.pr():w.newValue(i)}}class Rh{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===2,25231,`${this.expr.name}() function should have exactly 2 params`);let n=!1;const s=re(this.expr.params[0]).evaluate(e,t);switch(s.type){case"VECTOR":break;case"NULL":n=!0;break;default:return w.mr()}const i=re(this.expr.params[1]).evaluate(e,t);switch(i.type){case"VECTOR":break;case"NULL":n=!0;break;default:return w.mr()}if(n)return w.gr();const o=oB(s.value),a=oB(i.value);if(o===void 0||a===void 0||o.values?.length!==a.values?.length)return w.mr();const c=this.Mr(o,a);return c===void 0||isNaN(c)?w.mr():w.newValue({doubleValue:c})}}class ER extends Rh{Mr(e,t){const n=e?.values??[],s=t?.values??[];if(n.length===0)return;let i=0,o=0,a=0;for(let l=0;l<n.length;l++){if(!gr(n[l])||!gr(s[l]))return;const B=Xe(n[l]),f=Xe(s[l]);i+=B*f,o+=B*B,a+=f*f}const c=Math.sqrt(o)*Math.sqrt(a);if(c!==0)return 1-Math.max(-1,Math.min(1,i/c))}}class IR extends Rh{Mr(e,t){const n=e?.values??[],s=t?.values??[];if(n.length===0)return 0;let i=0;for(let o=0;o<n.length;o++){if(!gr(n[o])||!gr(s[o]))return;i+=Xe(n[o])*Xe(s[o])}return i}}class DR extends Rh{Mr(e,t){const n=e?.values??[],s=t?.values??[];if(n.length===0)return 0;let i=0;for(let o=0;o<n.length;o++){if(!gr(n[o])||!gr(s[o]))return;const a=Xe(n[o]),c=Xe(s[o]);i+=Math.pow(a-c,2)}return Math.sqrt(i)}}class yR{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===1,39044);const n=re(this.expr.params[0]).evaluate(e,t);switch(n.type){case"VECTOR":{const s=oB(n.value);return w.newValue({integerValue:s?.values?.length??0})}case"NULL":return w.gr();default:return w.mr()}}}const Go=BigInt(-62135596800),Uo=BigInt(253402300799),Fc=BigInt(1e3),dr=BigInt(1e6),TR=Go*Fc,wR=Uo*Fc+BigInt(999),AR=Go*dr,vR=Uo*dr+BigInt(999999);function bh(r){return r>=AR&&r<=vR}function rE(r){return r>=Go&&r<=Uo}function Ho(r,e){const t=BigInt(r);return!(t<Go||t>Uo)&&!(e<0||e>=1e9)&&(t!==Go||e===0)&&!(t===Uo&&e>999999999)}function sE(r,e){return e<0?{seconds:r-1,nanos:e+1e9}:{seconds:r,nanos:e}}function Sh(r){return BigInt(r.seconds)*dr+BigInt(Math.trunc(r.nanoseconds/1e3))}class Ph{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===1,49262,`${this.expr.name}() function should have exactly one parameter`);const n=re(this.expr.params[0]).evaluate(e,t);switch(n.type){case"INT":return this.toTimestamp(BigInt(n.value.integerValue));case"NULL":return w.gr();default:return w.mr()}}}class RR extends Ph{toTimestamp(e){if(!bh(e))return w.mr();let t=Number(e/dr),n=Number(e%dr*BigInt(1e3));const s=sE(t,n);return t=s.seconds,n=s.nanos,Ho(t,n)?w.newValue({timestampValue:{seconds:t,nanos:n}}):w.mr()}}class bR extends Ph{toTimestamp(e){if(!(function(o){return o>=TR&&o<=wR})(e))return w.mr();let t=Number(e/Fc),n=Number(e%Fc*BigInt(1e6));const s=sE(t,n);return t=s.seconds,n=s.nanos,Ho(t,n)?w.newValue({timestampValue:{seconds:t,nanos:n}}):w.mr()}}class SR extends Ph{toTimestamp(e){if(!rE(e))return w.mr();const t=Number(e);return w.newValue({timestampValue:{seconds:t,nanos:0}})}}class Nh{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===1,1265,`${this.expr.name}() function should have exactly one parameter`);const n=re(this.expr.params[0]).evaluate(e,t);switch(n.type){case"TIMESTAMP":break;case"NULL":return w.gr();default:return w.mr()}const s=hh(n.value.timestampValue);return Ho(s.seconds,s.nanoseconds)?this.Nr(s):w.mr()}}class PR extends Nh{Nr(e){const t=Sh(e);return bh(t)?w.newValue({integerValue:`${t.toString()}`}):w.mr()}}class NR extends Nh{Nr(e){const t=Sh(e),n=t/BigInt(1e3),s=t%BigInt(1e3);return n>BigInt(0)||s===BigInt(0)?w.newValue({integerValue:n.toString()}):w.newValue({integerValue:(n-BigInt(1)).toString()})}}class OR extends Nh{Nr(e){const t=BigInt(e.seconds);return rE(t)?w.newValue({integerValue:t.toString()}):w.mr()}}class iE{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===3,2775,`${this.expr.name}() function should have exactly 3 parameters`);let n=!1;const s=re(this.expr.params[0]).evaluate(e,t);switch(s.type){case"TIMESTAMP":break;case"NULL":n=!0;break;default:return w.mr()}const i=re(this.expr.params[1]).evaluate(e,t);let o;switch(i.type){case"STRING":if(o=(function(Y){switch(Y){case"microsecond":return"microsecond";case"millisecond":return"millisecond";case"second":return"second";case"minute":return"minute";case"hour":return"hour";case"day":return"day";default:return}})(i.value.stringValue),o===void 0)return w.mr();break;case"NULL":n=!0;break;default:return w.mr()}const a=re(this.expr.params[2]).evaluate(e,t);switch(a.type){case"INT":break;case"NULL":n=!0;break;default:return w.mr()}if(n)return w.gr();const c=BigInt(a.value.integerValue);let l;try{switch(o){case"microsecond":l=c;break;case"millisecond":l=c*BigInt(1e3);break;case"second":l=c*BigInt(1e6);break;case"minute":l=c*BigInt(6e7);break;case"hour":l=c*BigInt(36e8);break;case"day":l=c*BigInt(864e8);break;default:return w.mr()}if(o!=="microsecond"&&c!==BigInt(0)&&l/c!==BigInt(this.Lr(o)))return w.mr()}catch(j){return Yt(`Error during timestamp arithmetic: ${j}`),w.mr()}const B=hh(s.value.timestampValue);if(!Ho(B.seconds,B.nanoseconds))return w.mr();const f=Sh(B),p=this.Br(f,l);if(!bh(p))return w.mr();const m=Number(p/dr),y=p%dr,F=Number((y<0?y+dr:y)*BigInt(1e3)),V=y<0?m-1:m;return Ho(V,F)?w.newValue({timestampValue:{seconds:V,nanos:F}}):w.mr()}Lr(e){switch(e){case"millisecond":return 1e3;case"second":return 1e6;case"minute":return 6e7;case"hour":return 36e8;case"day":return 864e8;default:return 1}}}class FR extends iE{Br(e,t){return e+t}}class LR extends iE{Br(e,t){return e-t}}function qo(r){if((r=tE(r))instanceof ys)return`fld(${r.fieldName})`;if(r instanceof Ts)return`cst(${(function(t){return t===null?"null":typeof t=="number"?t.toString():typeof t=="string"?`"${t}"`:t instanceof Re?`ref(${t.path})`:t instanceof Cn?`vec(${JSON.stringify(t)})`:JSON.stringify(t)})(r.value)})`;if(r instanceof x)return`fn(${r.name},[${r.params.map(qo).join(",")}])`;if(r.expressionType==="ListOfExpressions")return`list([${r.cr.map(qo).join(",")}])`;throw new Error(`Unrecognized expr ${JSON.stringify(r,null,2)}`)}function kR(r){if(r instanceof Y_)return`${r._name}(${Ja(r.fields)})`;if(r instanceof X_){let e=`${r._name}(${Ja(r.accumulators)})`;return r.groups.size>0&&(e+=`grouping(${Ja(r.groups)})`),e}if(r instanceof Z_)return`${r._name}(${Ja(r.groups)})`;if(r instanceof ua)return`${r._name}(${r.hr})`;if(r instanceof la)return`${r._name}(${r.collectionId})`;if(r instanceof _u)return`${r._name}()`;if(r instanceof Eu)return`${r._name}(${r.Tr.sort()})`;if(r instanceof Ba)return`${r._name}(${qo(r.condition)})`;if(r instanceof Ir)return`${r._name}(${r.limit})`;if(r instanceof un)return`${r._name}(${(function(t){return t.map((n=>`${qo(n.expr)}${n.direction}`)).join(",")})(r.orderings)})`;throw new Error(`Unrecognized stage ${r._name}`)}function Ja(r){return`${Array.from(r.entries()).sort().map((([e,t])=>`${e}=${qo(t)}`)).join(",")}`}function Rn(r){return r.stages.map((e=>kR(e))).join("|")}function oE(r,e){return Rn(r)===Rn(e)}function Pe(r){return r instanceof st}function _C(r){return Pe(r)?Rn(r):po(r)}function aE(r){return Pe(r)?Rn(r):(function(t){return`${bc(Ot(t))}|lt:${t.limitType}`})(r)}function Du(r,e){return r instanceof st&&e instanceof st?oE(r,e):!(r instanceof st&&!(e instanceof st)||!(r instanceof st)&&e instanceof st)&&fA(r,e)}function yu(r){return Dn(r)?Rn(r):bc(r)}function Oh(r,e){return r instanceof st&&e instanceof st?oE(r,e):!(r instanceof st&&!(e instanceof st)||!(r instanceof st)&&e instanceof st)&&ah(r,e)}function xR(r,e){const t=(function(s){let i=!1;const o=[];for(const a of s)if(a instanceof un)if(i=!0,a.orderings.some((c=>c.expr instanceof ys&&c.expr.fieldName===an)))o.push(a);else{const c=a.orderings.map((l=>l));c.push(uc(an).ascending()),o.push(new un(c,{}))}else a instanceof Ir&&(i||(o.push(new un([uc(an).ascending()],{})),i=!0)),o.push(a);return i||o.push(new un([uc(an).ascending()],{})),o})(r.stages);if(r.userDataReader){const n=r.userDataReader.createContext(3,"toCorePipeline");t.forEach((s=>s._readUserData(n)))}return new st(r.userDataReader.serializer,t,e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Fh{constructor(e,t,n,s){this.batchId=e,this.localWriteTime=t,this.baseMutations=n,this.mutations=s}applyToRemoteDocument(e,t){const n=t.mutationResults;for(let s=0;s<this.mutations.length;s++){const i=this.mutations[s];i.key.isEqual(e.key)&&eA(i,e,n[s])}}applyToLocalView(e,t){for(const n of this.baseMutations)n.key.isEqual(e.key)&&(t=ho(n,e,t,this.localWriteTime));for(const n of this.mutations)n.key.isEqual(e.key)&&(t=ho(n,e,t,this.localWriteTime));return t}applyToLocalDocumentSet(e,t){const n=f_();return this.mutations.forEach((s=>{const i=e.get(s.key),o=i.overlayedDocument;let a=this.applyToLocalView(o,i.mutatedFields);a=t.has(s.key)?null:a;const c=Wm(o,a);c!==null&&n.set(s.key,c),o.isValidDocument()||o.convertToNoDocument(X.min())})),n}keys(){return this.mutations.reduce(((e,t)=>e.add(t.key)),ae())}isEqual(e){return this.batchId===e.batchId&&Xs(this.mutations,e.mutations,((t,n)=>$p(t,n)))&&Xs(this.baseMutations,e.baseMutations,((t,n)=>$p(t,n)))}}class Lh{constructor(e,t,n,s){this.batch=e,this.commitVersion=t,this.mutationResults=n,this.docVersions=s}static from(e,t,n){H(e.mutations.length===n.length,58842,{Ur:e.mutations.length,kr:n.length});let s=(function(){return gA})();const i=e.mutations;for(let o=0;o<i.length;o++)s=s.insert(i[o].key,n[o].version);return new Lh(e,t,n,s)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Lc="";function it(r){let e="";for(let t=0;t<r.length;t++)e.length>0&&(e=EC(e)),e=VR(r.get(t),e);return EC(e)}function VR(r,e){let t=e;const n=r.length;for(let s=0;s<n;s++){const i=r.charAt(s);switch(i){case"\0":t+="";break;case Lc:t+="";break;default:t+=i}}return t}function EC(r){return r+Lc+""}function ln(r){const e=r.length;if(H(e>=2,64408,{path:r}),e===2)return H(r.charAt(0)===Lc&&r.charAt(1)==="",56145,{path:r}),le.emptyPath();const t=e-2,n=[];let s="";for(let i=0;i<e;){const o=r.indexOf(Lc,i);switch((o<0||o>t)&&z(50515,{path:r}),r.charAt(o+1)){case"":const a=r.substring(i,o);let c;s.length===0?c=a:(s+=a,c=s,s=""),n.push(c);break;case"":s+=r.substring(i,o),s+="\0";break;case"":s+=r.substring(i,o+1);break;default:z(61167,{path:r})}i=o+2}return new le(n)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const qr="remoteDocuments",da="owner",Ps="owner",jo="mutationQueues",MR="userId",$t="mutations",IC="batchId",Yr="userMutationsIndex",DC=["userId","batchId"];/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function lc(r,e){return[r,it(e)]}function cE(r,e,t){return[r,it(e),t]}const GR={},ui="documentMutations",kc="remoteDocumentsV14",UR=["prefixPath","collectionGroup","readTime","documentId"],Bc="documentKeyIndex",HR=["prefixPath","collectionGroup","documentId"],uE="collectionGroupIndex",qR=["collectionGroup","readTime","prefixPath","documentId"],Ko="remoteDocumentGlobal",gB="remoteDocumentGlobalKey",li="targets",lE="queryTargetsIndex",jR=["canonicalId","targetId"],Bi="targetDocuments",KR=["targetId","path"],kh="documentTargetsIndex",JR=["path","targetId"],xc="targetGlobalKey",ns="targetGlobal",Jo="collectionParents",zR=["collectionId","parent"],hi="clientMetadata",$R="clientId",Tu="bundles",QR="bundleId",wu="namedQueries",WR="name",xh="indexConfiguration",YR="indexId",mB="collectionGroupIndex",XR="collectionGroup",Eo="indexState",ZR=["indexId","uid"],BE="sequenceNumberIndex",eb=["uid","sequenceNumber"],Io="indexEntries",tb=["indexId","uid","arrayValue","directionalValue","orderedDocumentKey","documentKey"],hE="documentKeyIndex",nb=["indexId","uid","orderedDocumentKey"],Au="documentOverlays",rb=["userId","collectionPath","documentId"],_B="collectionPathOverlayIndex",sb=["userId","collectionPath","largestBatchId"],fE="collectionGroupOverlayIndex",ib=["userId","collectionGroup","largestBatchId"],Vh="globals",ob="name",dE=[jo,$t,ui,qr,li,da,ns,Bi,hi,Ko,Jo,Tu,wu],ab=[...dE,Au],pE=[jo,$t,ui,kc,li,da,ns,Bi,hi,Ko,Jo,Tu,wu,Au],CE=pE,Mh=[...CE,xh,Eo,Io],cb=Mh,gE=[...Mh,Vh],ub=gE;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function mE(r,e,t){const n=r.store($t),s=r.store(ui),i=[],o=IDBKeyRange.only(t.batchId);let a=0;const c=n.Hn({range:o},((B,f,p)=>(a++,p.delete())));i.push(c.next((()=>{H(a===1,47070,{batchId:t.batchId})})));const l=[];for(const B of t.mutations){const f=cE(e,B.key.path,t.batchId);i.push(s.delete(f)),l.push(B.key)}return b.waitFor(i).next((()=>l))}function Vc(r){if(!r)return 0;let e;if(r.document)e=r.document;else if(r.unknownDocument)e=r.unknownDocument;else{if(!r.noDocument)throw z(14731);e=r.noDocument}return JSON.stringify(e).length}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class EB extends F_{constructor(e,t){super(),this.qr=e,this.currentSequenceNumber=t}}function qe(r,e){const t=Q(r);return pn.Cn(t.qr,e)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Gh{constructor(e,t){this.largestBatchId=e,this.mutation=t}getKey(){return this.mutation.key}isEqual(e){return e!==null&&this.mutation===e.mutation}toString(){return`Overlay{
      largestBatchId: ${this.largestBatchId},
      mutation: ${this.mutation.toString()}
    }`}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bn{constructor(e,t,n,s,i=X.min(),o=X.min(),a=be.EMPTY_BYTE_STRING,c=null){this.target=e,this.targetId=t,this.purpose=n,this.sequenceNumber=s,this.snapshotVersion=i,this.lastLimboFreeSnapshotVersion=o,this.resumeToken=a,this.expectedCount=c}withSequenceNumber(e){return new Bn(this.target,this.targetId,this.purpose,e,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount)}withResumeToken(e,t){return new Bn(this.target,this.targetId,this.purpose,this.sequenceNumber,t,this.lastLimboFreeSnapshotVersion,e,null)}withExpectedCount(e){return new Bn(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,e)}withLastLimboFreeSnapshotVersion(e){return new Bn(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,e,this.resumeToken,this.expectedCount)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _E{constructor(e){this.$r=e}}function lb(r,e){let t;if(e.document)t=vA(r.$r,e.document,!!e.hasCommittedMutations);else if(e.noDocument){const n=K.fromSegments(e.noDocument.path),s=ps(e.noDocument.readTime);t=Ae.newNoDocument(n,s),e.hasCommittedMutations&&t.setHasCommittedMutations()}else{if(!e.unknownDocument)return z(56709);{const n=K.fromSegments(e.unknownDocument.path),s=ps(e.unknownDocument.version);t=Ae.newUnknownDocument(n,s)}}return e.readTime&&t.setReadTime((function(s){const i=new ge(s[0],s[1]);return X.fromTimestamp(i)})(e.readTime)),t}function yC(r,e){const t=e.key,n={prefixPath:t.getCollectionPath().popLast().toArray(),collectionGroup:t.collectionGroup,documentId:t.path.lastSegment(),readTime:Mc(e.readTime),hasCommittedMutations:e.hasCommittedMutations};if(e.isFoundDocument())n.document=(function(i,o){return{name:ci(i,o.key),fields:o.data.value.mapValue.fields,updateTime:ts(i,o.version.toTimestamp()),createTime:ts(i,o.createTime.toTimestamp())}})(r.$r,e);else if(e.isNoDocument())n.noDocument={path:t.path.toArray(),readTime:ds(e.version)};else{if(!e.isUnknownDocument())return z(57904,{document:e});n.unknownDocument={path:t.path.toArray(),version:ds(e.version)}}return n}function Mc(r){const e=r.toTimestamp();return[e.seconds,e.nanoseconds]}function ds(r){const e=r.toTimestamp();return{seconds:e.seconds,nanoseconds:e.nanoseconds}}function ps(r){const e=new ge(r.seconds,r.nanoseconds);return X.fromTimestamp(e)}function Jr(r,e){const t=(e.baseMutations||[]).map((i=>pB(r.$r,i)));for(let i=0;i<e.mutations.length-1;++i){const o=e.mutations[i];if(i+1<e.mutations.length&&e.mutations[i+1].transform!==void 0){const a=e.mutations[i+1];o.updateTransforms=a.transform.fieldTransforms,e.mutations.splice(i+1,1),++i}}const n=e.mutations.map((i=>pB(r.$r,i))),s=ge.fromMillis(e.localWriteTimeMs);return new Fh(e.batchId,s,t,n)}function uo(r,e){const t=ps(e.readTime),n=e.lastLimboFreeSnapshotVersion!==void 0?ps(e.lastLimboFreeSnapshotVersion):X.min();let s;return s=(function(o){return o.structuredPipeline!==void 0})(e.query)?(function(o,a){const c=o.structuredPipeline;H((c?.pipeline?.stages??[]).length>0,1845);const l=c?.pipeline?.stages.map(Bb);return new st(a,l)})(e.query,r.$r):(function(o){return o.documents!==void 0})(e.query)?(function(o){const a=o.documents.length;return H(a===1,1966,{count:a}),Ot(oa(__(o.documents[0])))})(e.query):(function(o){return Ot(y_(o))})(e.query),new Bn(s,e.targetId,"TargetPurposeListen",e.lastListenSequenceNumber,t,n,be.fromBase64String(e.resumeToken))}function EE(r,e){const t=ds(e.snapshotVersion),n=ds(e.lastLimboFreeSnapshotVersion);let s;s=Dn(e.target)?T_(r.$r,e.target):ch(e.target)?I_(r.$r,e.target):D_(r.$r,e.target).Se;const i=e.resumeToken.toBase64();return{targetId:e.targetId,canonicalId:yu(e.target),readTime:t,resumeToken:i,lastListenSequenceNumber:e.sequenceNumber,lastLimboFreeSnapshotVersion:n,query:s}}function IE(r){const e=y_({parent:r.parent,structuredQuery:r.structuredQuery});return r.limitType==="LAST"?Pc(e,e.limit,"L"):e}function za(r,e){return new Gh(e.largestBatchId,pB(r.$r,e.overlayMutation))}function TC(r,e){const t=e.path.lastSegment();return[r,it(e.path.popLast()),t]}function wC(r,e,t,n){return{indexId:r,uid:e,sequenceNumber:t,readTime:ds(n.readTime),documentKey:it(n.documentKey.path),largestBatchId:n.largestBatchId}}function Bb(r){switch(r.name){case"collection":return new ua(r.args[0].referenceValue,{});case"collection_group":return new la(r.args[1].stringValue,{});case"database":return new _u({});case"documents":return new Eu(r.args.map((e=>e.referenceValue)),{});case"where":return new Ba(IB(r.args[0]),{});case"limit":{const e=r.args[0].integerValue??r.args[0].doubleValue;return new Ir(typeof e=="number"?e:Number(e),{})}case"sort":return new un(r.args.map((e=>(function(n){const s=n.mapValue?.fields;return new Th(IB(s.expression),s.direction?.stringValue,"orderingFromProto")})(e))),{});default:throw new Error(`Stage type: ${r.name} not supported.`)}}function IB(r){return r.fieldReferenceValue?new ys(On("_exprFromProto",r.fieldReferenceValue),"_exprFromProto"):r.functionValue?(function(t){return new x(t.functionValue.name,t.functionValue.args?.map(IB)||[])})(r):Ts._fromProto(r)}class vu{constructor(e,t,n,s){this.userId=e,this.serializer=t,this.indexManager=n,this.referenceDelegate=s,this.Kr={}}static Qr(e,t,n,s){H(e.uid!=="",64387);const i=e.isAuthenticated()?e.uid:"";return new vu(i,t,n,s)}checkEmpty(e){let t=!0;const n=IDBKeyRange.bound([this.userId,Number.NEGATIVE_INFINITY],[this.userId,Number.POSITIVE_INFINITY]);return Qn(e).Hn({index:Yr,range:n},((s,i,o)=>{t=!1,o.done()})).next((()=>t))}addMutationBatch(e,t,n,s){const i=qs(e),o=Qn(e);return o.add({}).next((a=>{H(typeof a=="number",49019);const c=new Fh(a,t,n,s),l=(function(m,y,F){const V=F.baseMutations.map((Y=>xo(m.$r,Y))),j=F.mutations.map((Y=>xo(m.$r,Y)));return{userId:y,batchId:F.batchId,localWriteTimeMs:F.localWriteTime.toMillis(),baseMutations:V,mutations:j}})(this.serializer,this.userId,c),B=[];let f=new me(((p,m)=>ie(p.canonicalString(),m.canonicalString())));for(const p of s){const m=cE(this.userId,p.key.path,a);f=f.add(p.key.path.popLast()),B.push(o.put(l)),B.push(i.put(m,GR))}return f.forEach((p=>{B.push(this.indexManager.addToCollectionParentIndex(e,p))})),e.addOnCommittedListener((()=>{this.Kr[a]=c.keys()})),b.waitFor(B).next((()=>c))}))}lookupMutationBatch(e,t){return Qn(e).get(t).next((n=>n?(H(n.userId===this.userId,48,"Unexpected user for mutation batch",{userId:n.userId,batchId:t}),Jr(this.serializer,n)):null))}Wr(e,t){return this.Kr[t]?b.resolve(this.Kr[t]):this.lookupMutationBatch(e,t).next((n=>{if(n){const s=n.keys();return this.Kr[t]=s,s}return null}))}getNextMutationBatchAfterBatchId(e,t){const n=t+1,s=IDBKeyRange.lowerBound([this.userId,n]);let i=null;return Qn(e).Hn({index:Yr,range:s},((o,a,c)=>{a.userId===this.userId&&(H(a.batchId>=n,47524,{Gr:n}),i=Jr(this.serializer,a)),c.done()})).next((()=>i))}getHighestUnacknowledgedBatchId(e){const t=IDBKeyRange.upperBound([this.userId,Number.POSITIVE_INFINITY]);let n=Zr;return Qn(e).Hn({index:Yr,range:t,reverse:!0},((s,i,o)=>{n=i.batchId,o.done()})).next((()=>n))}getAllMutationBatches(e){const t=IDBKeyRange.bound([this.userId,Zr],[this.userId,Number.POSITIVE_INFINITY]);return Qn(e).Qn(Yr,t).next((n=>n.map((s=>Jr(this.serializer,s)))))}getAllMutationBatchesAffectingDocumentKey(e,t){const n=lc(this.userId,t.path),s=IDBKeyRange.lowerBound(n),i=[];return qs(e).Hn({range:s},((o,a,c)=>{const[l,B,f]=o,p=ln(B);if(l===this.userId&&t.path.isEqual(p))return Qn(e).get(f).next((m=>{if(!m)throw z(61480,{zr:o,batchId:f});H(m.userId===this.userId,10503,"Unexpected user for mutation batch",{userId:m.userId,batchId:f}),i.push(Jr(this.serializer,m))}));c.done()})).next((()=>i))}getAllMutationBatchesAffectingDocumentKeys(e,t){let n=new me(ie);const s=[];return t.forEach((i=>{const o=lc(this.userId,i.path),a=IDBKeyRange.lowerBound(o),c=qs(e).Hn({range:a},((l,B,f)=>{const[p,m,y]=l,F=ln(m);p===this.userId&&i.path.isEqual(F)?n=n.add(y):f.done()}));s.push(c)})),b.waitFor(s).next((()=>this.jr(e,n)))}getAllMutationBatchesAffectingQuery(e,t){const n=t.path,s=n.length+1,i=lc(this.userId,n),o=IDBKeyRange.lowerBound(i);let a=new me(ie);return qs(e).Hn({range:o},((c,l,B)=>{const[f,p,m]=c,y=ln(p);f===this.userId&&n.isPrefixOf(y)?y.length===s&&(a=a.add(m)):B.done()})).next((()=>this.jr(e,a)))}jr(e,t){const n=[],s=[];return t.forEach((i=>{s.push(Qn(e).get(i).next((o=>{if(o===null)throw z(35274,{batchId:i});H(o.userId===this.userId,9748,"Unexpected user for mutation batch",{userId:o.userId,batchId:i}),n.push(Jr(this.serializer,o))})))})),b.waitFor(s).next((()=>n))}removeMutationBatch(e,t){return mE(e.qr,this.userId,t).next((n=>(e.addOnCommittedListener((()=>{this.Hr(t.batchId)})),b.forEach(n,(s=>this.referenceDelegate.markPotentiallyOrphaned(e,s))))))}Hr(e){delete this.Kr[e]}performConsistencyCheck(e){return this.checkEmpty(e).next((t=>{if(!t)return b.resolve();const n=IDBKeyRange.lowerBound((function(o){return[o]})(this.userId)),s=[];return qs(e).Hn({range:n},((i,o,a)=>{if(i[0]===this.userId){const c=ln(i[1]);s.push(c)}else a.done()})).next((()=>{H(s.length===0,56720,{Jr:s.map((i=>i.canonicalString()))})}))}))}containsKey(e,t){return DE(e,this.userId,t)}Yr(e){return yE(e).get(this.userId).next((t=>t||{userId:this.userId,lastAcknowledgedBatchId:Zr,lastStreamToken:""}))}}function DE(r,e,t){const n=lc(e,t.path),s=n[1],i=IDBKeyRange.lowerBound(n);let o=!1;return qs(r).Hn({range:i,jn:!0},((a,c,l)=>{const[B,f,p]=a;B===e&&f===s&&(o=!0),l.done()})).next((()=>o))}function Qn(r){return qe(r,$t)}function qs(r){return qe(r,ui)}function yE(r){return qe(r,jo)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hb{getBundleMetadata(e,t){return AC(e).get(t).next((n=>{if(n)return(function(i){return{id:i.bundleId,createTime:ps(i.createTime),version:i.version}})(n)}))}saveBundleMetadata(e,t){return AC(e).put((function(s){return{bundleId:s.id,createTime:ds(We(s.createTime)),version:s.version}})(t))}getNamedQuery(e,t){return vC(e).get(t).next((n=>{if(n)return(function(i){return{name:i.name,query:IE(i.bundledQuery),readTime:ps(i.readTime)}})(n)}))}saveNamedQuery(e,t){return vC(e).put((function(s){return{name:s.name,readTime:ds(We(s.readTime)),bundledQuery:s.bundledQuery}})(t))}}function AC(r){return qe(r,Tu)}function vC(r){return qe(r,wu)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ru{constructor(e,t){this.serializer=e,this.userId=t}static Qr(e,t){const n=t.uid||"";return new Ru(e,n)}getOverlay(e,t){return Ns(e).get(TC(this.userId,t)).next((n=>n?za(this.serializer,n):null))}getOverlays(e,t){const n=Ht();return b.forEach(t,(s=>this.getOverlay(e,s).next((i=>{i!==null&&n.set(s,i)})))).next((()=>n))}getAllOverlays(e,t){const n=Ht();return Ns(e).Hn(((s,i)=>{const o=za(this.serializer,i);o.largestBatchId>t&&n.set(o.getKey(),o)})).next((()=>n))}saveOverlays(e,t,n){const s=[];return n.forEach(((i,o)=>{const a=new Gh(t,o);s.push(this.Zr(e,a))})),b.waitFor(s)}removeOverlaysForBatchId(e,t,n){const s=new Set;t.forEach((o=>s.add(it(o.getCollectionPath()))));const i=[];return s.forEach((o=>{const a=IDBKeyRange.bound([this.userId,o,n],[this.userId,o,n+1],!1,!0);i.push(Ns(e).zn(_B,a))})),b.waitFor(i)}getOverlaysForCollection(e,t,n){const s=Ht(),i=it(t),o=IDBKeyRange.bound([this.userId,i,n],[this.userId,i,Number.POSITIVE_INFINITY],!0);return Ns(e).Qn(_B,o).next((a=>{for(const c of a){const l=za(this.serializer,c);s.set(l.getKey(),l)}return s}))}getOverlaysForCollectionGroup(e,t,n,s){const i=Ht();let o;const a=IDBKeyRange.bound([this.userId,t,n],[this.userId,t,Number.POSITIVE_INFINITY],!0);return Ns(e).Hn({index:fE,range:a},((c,l,B)=>{const f=za(this.serializer,l);i.size()<s||f.largestBatchId===o?(i.set(f.getKey(),f),o=f.largestBatchId):B.done()})).next((()=>i))}Zr(e,t){return Ns(e).put((function(s,i,o){const[a,c,l]=TC(i,o.mutation.key);return{userId:i,collectionPath:c,documentId:l,collectionGroup:o.mutation.key.getCollectionGroup(),largestBatchId:o.largestBatchId,overlayMutation:xo(s.$r,o.mutation)}})(this.serializer,this.userId,t))}}function Ns(r){return qe(r,Au)}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fb{Xr(e){return qe(e,Vh)}getSessionToken(e){return this.Xr(e).get("sessionToken").next((t=>{const n=t?.value;return n?be.fromUint8Array(n):be.EMPTY_BYTE_STRING}))}setSessionToken(e,t){return this.Xr(e).put({name:"sessionToken",value:t.toUint8Array()})}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zr{constructor(){}ei(e,t){this.ti(e,t),t.ni()}ti(e,t){if("nullValue"in e)this.ri(t,5);else if("booleanValue"in e)this.ri(t,10),t.ii(e.booleanValue?1:0);else if("integerValue"in e)this.ri(t,15),t.ii(ye(e.integerValue));else if("doubleValue"in e){const n=ye(e.doubleValue);isNaN(n)?this.ri(t,13):(this.ri(t,15),ei(n)?t.ii(0):t.ii(n))}else if("timestampValue"in e){let n=e.timestampValue;this.ri(t,20),typeof n=="string"&&(n=Pn(n)),t.si(`${n.seconds||""}`),t.ii(n.nanos||0)}else if("stringValue"in e)this._i(e.stringValue,t),this.oi(t);else if("bytesValue"in e)this.ri(t,30),t.ai(Nn(e.bytesValue)),this.oi(t);else if("referenceValue"in e)this.ui(e.referenceValue,t);else if("geoPointValue"in e){const n=e.geoPointValue;this.ri(t,45),t.ii(n.latitude||0),t.ii(n.longitude||0)}else"mapValue"in e?qm(e)?this.ri(t,Number.MAX_SAFE_INTEGER):hs(e)?this.ci(e.mapValue,t):(this.li(e.mapValue,t),this.oi(t)):"arrayValue"in e?(this.Ei(e.arrayValue,t),this.oi(t)):z(19022,{hi:e})}_i(e,t){this.ri(t,25),this.Ti(e,t)}Ti(e,t){t.si(e)}li(e,t){const n=e.fields||{};this.ri(t,55);for(const s of Object.keys(n))this._i(s,t),this.ti(n[s],t)}ci(e,t){const n=e.fields||{};this.ri(t,53);const s=Bs,i=n[s].arrayValue?.values?.length||0;this.ri(t,15),t.ii(ye(i)),this._i(s,t),this.ti(n[s],t)}Ei(e,t){const n=e.values||[];this.ri(t,50);for(const s of n)this.ti(s,t)}ui(e,t){this.ri(t,37),K.fromName(e).path.forEach((n=>{this.ri(t,60),this.Ti(n,t)}))}ri(e,t){e.ii(t)}oi(e){e.ii(2)}}zr.Pi=new zr;/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law | agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES | CONDITIONS OF ANY KIND, either express | implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Os=255;function db(r){if(r===0)return 8;let e=0;return r>>4||(e+=4,r<<=4),r>>6||(e+=2,r<<=2),r>>7||(e+=1),e}function RC(r){const e=64-(function(n){let s=0;for(let i=0;i<8;++i){const o=db(255&n[i]);if(s+=o,o!==8)break}return s})(r);return Math.ceil(e/8)}class pb{constructor(){this.buffer=new Uint8Array(1024),this.position=0}Ii(e){const t=e[Symbol.iterator]();let n=t.next();for(;!n.done;)this.Ri(n.value),n=t.next();this.Ai()}Vi(e){const t=e[Symbol.iterator]();let n=t.next();for(;!n.done;)this.di(n.value),n=t.next();this.fi()}mi(e){for(const t of e){const n=t.charCodeAt(0);if(n<128)this.Ri(n);else if(n<2048)this.Ri(960|n>>>6),this.Ri(128|63&n);else if(t<"\uD800"||"\uDBFF"<t)this.Ri(480|n>>>12),this.Ri(128|63&n>>>6),this.Ri(128|63&n);else{const s=t.codePointAt(0);this.Ri(240|s>>>18),this.Ri(128|63&s>>>12),this.Ri(128|63&s>>>6),this.Ri(128|63&s)}}this.Ai()}pi(e){for(const t of e){const n=t.charCodeAt(0);if(n<128)this.di(n);else if(n<2048)this.di(960|n>>>6),this.di(128|63&n);else if(t<"\uD800"||"\uDBFF"<t)this.di(480|n>>>12),this.di(128|63&n>>>6),this.di(128|63&n);else{const s=t.codePointAt(0);this.di(240|s>>>18),this.di(128|63&s>>>12),this.di(128|63&s>>>6),this.di(128|63&s)}}this.fi()}gi(e){const t=this.yi(e),n=RC(t);this.wi(1+n),this.buffer[this.position++]=255&n;for(let s=t.length-n;s<t.length;++s)this.buffer[this.position++]=255&t[s]}bi(e){const t=this.yi(e),n=RC(t);this.wi(1+n),this.buffer[this.position++]=~(255&n);for(let s=t.length-n;s<t.length;++s)this.buffer[this.position++]=~(255&t[s])}Si(){this.Di(Os),this.Di(255)}xi(){this.Ci(Os),this.Ci(255)}reset(){this.position=0}seed(e){this.wi(e.length),this.buffer.set(e,this.position),this.position+=e.length}Fi(){return this.buffer.slice(0,this.position)}yi(e){const t=(function(i){const o=new DataView(new ArrayBuffer(8));return o.setFloat64(0,i,!1),new Uint8Array(o.buffer)})(e),n=!!(128&t[0]);t[0]^=n?255:128;for(let s=1;s<t.length;++s)t[s]^=n?255:0;return t}Ri(e){const t=255&e;t===0?(this.Di(0),this.Di(255)):t===Os?(this.Di(Os),this.Di(0)):this.Di(t)}di(e){const t=255&e;t===0?(this.Ci(0),this.Ci(255)):t===Os?(this.Ci(Os),this.Ci(0)):this.Ci(e)}Ai(){this.Di(0),this.Di(1)}fi(){this.Ci(0),this.Ci(1)}Di(e){this.wi(1),this.buffer[this.position++]=e}Ci(e){this.wi(1),this.buffer[this.position++]=~e}wi(e){const t=e+this.position;if(t<=this.buffer.length)return;let n=2*this.buffer.length;n<t&&(n=t);const s=new Uint8Array(n);s.set(this.buffer),this.buffer=s}}class Cb{constructor(e){this.Oi=e}ai(e){this.Oi.Ii(e)}si(e){this.Oi.mi(e)}ii(e){this.Oi.gi(e)}ni(){this.Oi.Si()}}class gb{constructor(e){this.Oi=e}ai(e){this.Oi.Vi(e)}si(e){this.Oi.pi(e)}ii(e){this.Oi.bi(e)}ni(){this.Oi.xi()}}class Xi{constructor(){this.Oi=new pb,this.ascending=new Cb(this.Oi),this.descending=new gb(this.Oi)}seed(e){this.Oi.seed(e)}Mi(e){return e===0?this.ascending:this.descending}Fi(){return this.Oi.Fi()}reset(){this.Oi.reset()}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $r{constructor(e,t,n,s){this.Ni=e,this.Li=t,this.Bi=n,this.Ui=s}ki(){const e=this.Ui.length,t=e===0||this.Ui[e-1]===255?e+1:e,n=new Uint8Array(t);return n.set(this.Ui,0),t!==e?n.set([0],this.Ui.length):++n[n.length-1],new $r(this.Ni,this.Li,this.Bi,n)}qi(e,t,n){return{indexId:this.Ni,uid:e,arrayValue:hc(this.Bi),directionalValue:hc(this.Ui),orderedDocumentKey:hc(t),documentKey:n.path.toArray()}}$i(e,t,n){const s=this.qi(e,t,n);return[s.indexId,s.uid,s.arrayValue,s.directionalValue,s.orderedDocumentKey,s.documentKey]}}function Wn(r,e){let t=r.Ni-e.Ni;return t!==0?t:(t=bC(r.Bi,e.Bi),t!==0?t:(t=bC(r.Ui,e.Ui),t!==0?t:K.comparator(r.Li,e.Li)))}function bC(r,e){for(let t=0;t<r.length&&t<e.length;++t){const n=r[t]-e[t];if(n!==0)return n}return r.length-e.length}function hc(r){return fm()?(function(t){let n="";for(let s=0;s<t.length;s++)n+=String.fromCharCode(t[s]);return n})(r):r}function SC(r){return typeof r!="string"?r:(function(t){const n=new Uint8Array(t.length);for(let s=0;s<t.length;s++)n[s]=t.charCodeAt(s);return n})(r)}class PC{constructor(e){this.Ki=new me(((t,n)=>Ge.comparator(t.field,n.field))),this.collectionId=e.collectionGroup!=null?e.collectionGroup:e.path.lastSegment(),this.Qi=e.orderBy,this.Wi=[];for(const t of e.filters){const n=t;n.isInequality()?this.Ki=this.Ki.add(n):this.Wi.push(n)}}get Gi(){return this.Ki.size>1}zi(e){if(H(e.collectionGroup===this.collectionId,49279),this.Gi)return!1;const t=uB(e);if(t!==void 0&&!this.ji(t))return!1;const n=Hr(e);let s=new Set,i=0,o=0;for(;i<n.length&&this.ji(n[i]);++i)s=s.add(n[i].fieldPath.canonicalString());if(i===n.length)return!0;if(this.Ki.size>0){const a=this.Ki.getIterator().getNext();if(!s.has(a.field.canonicalString())){const c=n[i];if(!this.Hi(a,c)||!this.Ji(this.Qi[o++],c))return!1}++i}for(;i<n.length;++i){const a=n[i];if(o>=this.Qi.length||!this.Ji(this.Qi[o++],a))return!1}return!0}Yi(){if(this.Gi)return null;let e=new me(Ge.comparator);const t=[];for(const n of this.Wi)if(!n.field.isKeyField())if(n.op==="array-contains"||n.op==="array-contains-any")t.push(new ic(n.field,2));else{if(e.has(n.field))continue;e=e.add(n.field),t.push(new ic(n.field,0))}for(const n of this.Qi)n.field.isKeyField()||e.has(n.field)||(e=e.add(n.field),t.push(new ic(n.field,n.dir==="asc"?0:1)));return new Rc(Rc.UNKNOWN_ID,this.collectionId,t,ko.empty())}ji(e){for(const t of this.Wi)if(this.Hi(t,e))return!0;return!1}Hi(e,t){if(e===void 0||!e.field.isEqual(t.fieldPath))return!1;const n=e.op==="array-contains"||e.op==="array-contains-any";return t.kind===2===n}Ji(e,t){return!!e.field.isEqual(t.fieldPath)&&(t.kind===0&&e.dir==="asc"||t.kind===1&&e.dir==="desc")}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function TE(r){if(H(r instanceof he||r instanceof _e,20012),r instanceof he){if(r instanceof s_){const t=r.value.arrayValue?.values?.map((n=>he.create(r.field,"==",n)))||[];return _e.create(t,"or")}return r}const e=r.filters.map((t=>TE(t)));return _e.create(e,r.op)}function mb(r){if(r.getFilters().length===0)return[];const e=TB(TE(r));return H(wE(e),7391),DB(e)||yB(e)?[e]:e.getFilters()}function DB(r){return r instanceof he}function yB(r){return r instanceof _e&&ih(r)}function wE(r){return DB(r)||yB(r)||(function(t){if(t instanceof _e&&aB(t)){for(const n of t.getFilters())if(!DB(n)&&!yB(n))return!1;return!0}return!1})(r)}function TB(r){if(H(r instanceof he||r instanceof _e,34018),r instanceof he)return r;if(r.filters.length===1)return TB(r.filters[0]);const e=r.filters.map((n=>TB(n)));let t=_e.create(e,r.op);return t=Gc(t),wE(t)?t:(H(t instanceof _e,64498),H(oi(t),40251),H(t.filters.length>1,57927),t.filters.reduce(((n,s)=>Uh(n,s))))}function Uh(r,e){let t;return H(r instanceof he||r instanceof _e,38388),H(e instanceof he||e instanceof _e,25473),t=r instanceof he?e instanceof he?(function(s,i){return _e.create([s,i],"and")})(r,e):NC(r,e):e instanceof he?NC(e,r):(function(s,i){if(H(s.filters.length>0&&i.filters.length>0,48005),oi(s)&&oi(i))return t_(s,i.getFilters());const o=aB(s)?s:i,a=aB(s)?i:s,c=o.filters.map((l=>Uh(l,a)));return _e.create(c,"or")})(r,e),Gc(t)}function NC(r,e){if(oi(e))return t_(e,r.getFilters());{const t=e.filters.map((n=>Uh(r,n)));return _e.create(t,"or")}}function Gc(r){if(H(r instanceof he||r instanceof _e,11850),r instanceof he)return r;const e=r.getFilters();if(e.length===1)return Gc(e[0]);if(Zm(r))return r;const t=e.map((s=>Gc(s))),n=[];return t.forEach((s=>{s instanceof he?n.push(s):s instanceof _e&&(s.op===r.op?n.push(...s.filters):n.push(s))})),n.length===1?n[0]:_e.create(n,r.op)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _b{constructor(){this.Zi=new Hh}addToCollectionParentIndex(e,t){return this.Zi.add(t),b.resolve()}getCollectionParents(e,t){return b.resolve(this.Zi.getEntries(t))}addFieldIndex(e,t){return b.resolve()}deleteFieldIndex(e,t){return b.resolve()}deleteAllFieldIndexes(e){return b.resolve()}createTargetIndexes(e,t){return b.resolve()}getDocumentsMatchingTarget(e,t){return b.resolve(null)}getIndexType(e,t){return b.resolve(0)}getFieldIndexes(e,t){return b.resolve([])}getNextCollectionGroupToUpdate(e){return b.resolve(null)}getMinOffset(e,t){return b.resolve(kt.min())}getMinOffsetFromCollectionGroup(e,t){return b.resolve(kt.min())}updateCollectionGroup(e,t,n){return b.resolve()}updateIndexEntries(e,t){return b.resolve()}}class Hh{constructor(){this.index={}}add(e){const t=e.lastSegment(),n=e.popLast(),s=this.index[t]||new me(le.comparator),i=!s.has(n);return this.index[t]=s.add(n),i}has(e){const t=e.lastSegment(),n=e.popLast(),s=this.index[t];return s&&s.has(n)}getEntries(e){return(this.index[e]||new me(le.comparator)).toArray()}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const OC="IndexedDbIndexManager",$a=new Uint8Array(0);class Eb{constructor(e,t){this.databaseId=t,this.Xi=new Hh,this.es=new Gn((n=>bc(n)),((n,s)=>ah(n,s))),this.uid=e.uid||""}addToCollectionParentIndex(e,t){if(!this.Xi.has(t)){const n=t.lastSegment(),s=t.popLast();e.addOnCommittedListener((()=>{this.Xi.add(t)}));const i={collectionId:n,parent:it(s)};return FC(e).put(i)}return b.resolve()}getCollectionParents(e,t){const n=[],s=IDBKeyRange.bound([t,""],[Om(t),""],!1,!0);return FC(e).Qn(s).next((i=>{for(const o of i){if(o.collectionId!==t)break;n.push(ln(o.parent))}return n}))}addFieldIndex(e,t){const n=Zi(e),s=(function(a){return{indexId:a.indexId,collectionGroup:a.collectionGroup,fields:a.fields.map((c=>[c.fieldPath.canonicalString(),c.kind]))}})(t);delete s.indexId;const i=n.add(s);if(t.indexState){const o=Ls(e);return i.next((a=>{o.put(wC(a,this.uid,t.indexState.sequenceNumber,t.indexState.offset))}))}return i.next()}deleteFieldIndex(e,t){const n=Zi(e),s=Ls(e),i=Fs(e);return n.delete(t.indexId).next((()=>s.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0)))).next((()=>i.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0))))}deleteAllFieldIndexes(e){const t=Zi(e),n=Fs(e),s=Ls(e);return t.zn().next((()=>n.zn())).next((()=>s.zn()))}createTargetIndexes(e,t){return b.forEach(this.ts(t),(n=>this.getIndexType(e,n).next((s=>{if(s===0||s===1){const i=new PC(n).Yi();if(i!=null)return this.addFieldIndex(e,i)}}))))}getDocumentsMatchingTarget(e,t){const n=Fs(e);let s=!0;const i=new Map;return b.forEach(this.ts(t),(o=>this.ns(e,o).next((a=>{s&&(s=!!a),i.set(o,a)})))).next((()=>{if(s){let o=ae();const a=[];return b.forEach(i,((c,l)=>{G(OC,`Using index ${(function(ee){return`id=${ee.indexId}|cg=${ee.collectionGroup}|f=${ee.fields.map((se=>`${se.fieldPath}:${se.kind}`)).join(",")}`})(c)} to execute ${bc(t)}`);const B=(function(ee,se){const fe=uB(se);if(fe===void 0)return null;for(const oe of Sc(ee,fe.fieldPath))switch(oe.op){case"array-contains-any":return oe.value.arrayValue.values||[];case"array-contains":return[oe.value]}return null})(l,c),f=(function(ee,se){const fe=new Map;for(const oe of Hr(se))for(const T of Sc(ee,oe.fieldPath))switch(T.op){case"==":case"in":fe.set(oe.fieldPath.canonicalString(),T.value);break;case"not-in":case"!=":return fe.set(oe.fieldPath.canonicalString(),T.value),Array.from(fe.values())}return null})(l,c),p=(function(ee,se){const fe=[];let oe=!0;for(const T of Hr(se)){const E=T.kind===0?Zp(ee,T.fieldPath,ee.startAt):eC(ee,T.fieldPath,ee.startAt);fe.push(E.value),oe&&(oe=E.inclusive)}return new ii(fe,oe)})(l,c),m=(function(ee,se){const fe=[];let oe=!0;for(const T of Hr(se)){const E=T.kind===0?eC(ee,T.fieldPath,ee.endAt):Zp(ee,T.fieldPath,ee.endAt);fe.push(E.value),oe&&(oe=E.inclusive)}return new ii(fe,oe)})(l,c),y=this.rs(c,l,p),F=this.rs(c,l,m),V=this.ss(c,l,f),j=this._s(c.indexId,B,y,p.inclusive,F,m.inclusive,V);return b.forEach(j,(Y=>n.Gn(Y,t.limit).next((ee=>{ee.forEach((se=>{const fe=K.fromSegments(se.documentKey);o.has(fe)||(o=o.add(fe),a.push(fe))}))}))))})).next((()=>a))}return b.resolve(null)}))}ts(e){let t=this.es.get(e);return t||(e.filters.length===0?t=[e]:t=mb(_e.create(e.filters,"and")).map((n=>lB(e.path,e.collectionGroup,e.orderBy,n.getFilters(),e.limit,e.startAt,e.endAt))),this.es.set(e,t),t)}_s(e,t,n,s,i,o,a){const c=(t!=null?t.length:1)*Math.max(n.length,i.length),l=c/(t!=null?t.length:1),B=[];for(let f=0;f<c;++f){const p=t?this.us(t[f/l]):$a,m=this.cs(e,p,n[f%l],s),y=this.ls(e,p,i[f%l],o),F=a.map((V=>this.cs(e,p,V,!0)));B.push(...this.createRange(m,y,F))}return B}cs(e,t,n,s){const i=new $r(e,K.empty(),t,n);return s?i:i.ki()}ls(e,t,n,s){const i=new $r(e,K.empty(),t,n);return s?i.ki():i}ns(e,t){const n=new PC(t),s=t.collectionGroup!=null?t.collectionGroup:t.path.lastSegment();return this.getFieldIndexes(e,s).next((i=>{let o=null;for(const a of i)n.zi(a)&&(!o||a.fields.length>o.fields.length)&&(o=a);return o}))}getIndexType(e,t){let n=2;const s=this.ts(t);return b.forEach(s,(i=>this.ns(e,i).next((o=>{o?n!==0&&o.fields.length<(function(c){let l=new me(Ge.comparator),B=!1;for(const f of c.filters)for(const p of f.getFlattenedFilters())p.field.isKeyField()||(p.op==="array-contains"||p.op==="array-contains-any"?B=!0:l=l.add(p.field));for(const f of c.orderBy)f.field.isKeyField()||(l=l.add(f.field));return l.size+(B?1:0)})(i)&&(n=1):n=0})))).next((()=>(function(o){return o.limit!==null})(t)&&s.length>1&&n===2?1:n))}Es(e,t){const n=new Xi;for(const s of Hr(e)){const i=t.data.field(s.fieldPath);if(i==null)return null;const o=n.Mi(s.kind);zr.Pi.ei(i,o)}return n.Fi()}us(e){const t=new Xi;return zr.Pi.ei(e,t.Mi(0)),t.Fi()}hs(e,t){const n=new Xi;return zr.Pi.ei(No(this.databaseId,t),n.Mi((function(i){const o=Hr(i);return o.length===0?0:o[o.length-1].kind})(e))),n.Fi()}ss(e,t,n){if(n===null)return[];let s=[];s.push(new Xi);let i=0;for(const o of Hr(e)){const a=n[i++];for(const c of s)if(this.Ts(t,o.fieldPath)&&mr(a))s=this.Ps(s,o,a);else{const l=c.Mi(o.kind);zr.Pi.ei(a,l)}}return this.Is(s)}rs(e,t,n){return this.ss(e,t,n.position)}Is(e){const t=[];for(let n=0;n<e.length;++n)t[n]=e[n].Fi();return t}Ps(e,t,n){const s=[...e],i=[];for(const o of n.arrayValue.values||[])for(const a of s){const c=new Xi;c.seed(a.Fi()),zr.Pi.ei(o,c.Mi(t.kind)),i.push(c)}return i}Ts(e,t){return!!e.filters.find((n=>n instanceof he&&n.field.isEqual(t)&&(n.op==="in"||n.op==="not-in")))}getFieldIndexes(e,t){const n=Zi(e),s=Ls(e);return(t?n.Qn(mB,IDBKeyRange.bound(t,t)):n.Qn()).next((i=>{const o=[];return b.forEach(i,(a=>s.get([a.indexId,this.uid]).next((c=>{o.push((function(B,f){const p=f?new ko(f.sequenceNumber,new kt(ps(f.readTime),new K(ln(f.documentKey)),f.largestBatchId)):ko.empty(),m=B.fields.map((([y,F])=>new ic(Ge.fromServerFormat(y),F)));return new Rc(B.indexId,B.collectionGroup,m,p)})(a,c))})))).next((()=>o))}))}getNextCollectionGroupToUpdate(e){return this.getFieldIndexes(e).next((t=>t.length===0?null:(t.sort(((n,s)=>{const i=n.indexState.sequenceNumber-s.indexState.sequenceNumber;return i!==0?i:ie(n.collectionGroup,s.collectionGroup)})),t[0].collectionGroup)))}updateCollectionGroup(e,t,n){const s=Zi(e),i=Ls(e);return this.Rs(e).next((o=>s.Qn(mB,IDBKeyRange.bound(t,t)).next((a=>b.forEach(a,(c=>i.put(wC(c.indexId,this.uid,o,n))))))))}updateIndexEntries(e,t){const n=new Map;return b.forEach(t,((s,i)=>{const o=n.get(s.collectionGroup);return(o?b.resolve(o):this.getFieldIndexes(e,s.collectionGroup)).next((a=>(n.set(s.collectionGroup,a),b.forEach(a,(c=>this.As(e,s,c).next((l=>{const B=this.Vs(i,c);return l.isEqual(B)?b.resolve():this.ds(e,i,c,l,B)})))))))}))}fs(e,t,n,s){return Fs(e).put(s.qi(this.uid,this.hs(n,t.key),t.key))}ps(e,t,n,s){return Fs(e).delete(s.$i(this.uid,this.hs(n,t.key),t.key))}As(e,t,n){const s=Fs(e);let i=new me(Wn);return s.Hn({index:hE,range:IDBKeyRange.only([n.indexId,this.uid,hc(this.hs(n,t))])},((o,a)=>{i=i.add(new $r(n.indexId,t,SC(a.arrayValue),SC(a.directionalValue)))})).next((()=>i))}Vs(e,t){let n=new me(Wn);const s=this.Es(t,e);if(s==null)return n;const i=uB(t);if(i!=null){const o=e.data.field(i.fieldPath);if(mr(o))for(const a of o.arrayValue.values||[])n=n.add(new $r(t.indexId,e.key,this.us(a),s))}else n=n.add(new $r(t.indexId,e.key,$a,s));return n}ds(e,t,n,s,i){G(OC,"Updating index entries for document '%s'",t.key);const o=[];return(function(c,l,B,f,p){const m=c.getIterator(),y=l.getIterator();let F=Ss(m),V=Ss(y);for(;F||V;){let j=!1,Y=!1;if(F&&V){const ee=B(F,V);ee<0?Y=!0:ee>0&&(j=!0)}else F!=null?Y=!0:j=!0;j?(f(V),V=Ss(y)):Y?(p(F),F=Ss(m)):(F=Ss(m),V=Ss(y))}})(s,i,Wn,(a=>{o.push(this.fs(e,t,n,a))}),(a=>{o.push(this.ps(e,t,n,a))})),b.waitFor(o)}Rs(e){let t=1;return Ls(e).Hn({index:BE,reverse:!0,range:IDBKeyRange.upperBound([this.uid,Number.MAX_SAFE_INTEGER])},((n,s,i)=>{i.done(),t=s.sequenceNumber+1})).next((()=>t))}createRange(e,t,n){n=n.sort(((o,a)=>Wn(o,a))).filter(((o,a,c)=>!a||Wn(o,c[a-1])!==0));const s=[];s.push(e);for(const o of n){const a=Wn(o,e),c=Wn(o,t);if(a===0)s[0]=e.ki();else if(a>0&&c<0)s.push(o),s.push(o.ki());else if(c>0)break}s.push(t);const i=[];for(let o=0;o<s.length;o+=2){if(this.gs(s[o],s[o+1]))return[];const a=s[o].$i(this.uid,$a,K.empty()),c=s[o+1].$i(this.uid,$a,K.empty());i.push(IDBKeyRange.bound(a,c))}return i}gs(e,t){return Wn(e,t)>0}getMinOffsetFromCollectionGroup(e,t){return this.getFieldIndexes(e,t).next(LC)}getMinOffset(e,t){return b.mapArray(this.ts(t),(n=>this.ns(e,n).next((s=>s||z(44426))))).next(LC)}}function FC(r){return qe(r,Jo)}function Fs(r){return qe(r,Io)}function Zi(r){return qe(r,xh)}function Ls(r){return qe(r,Eo)}function LC(r){H(r.length!==0,28825);let e=r[0].indexState.offset,t=e.largestBatchId;for(let n=1;n<r.length;n++){const s=r[n].indexState.offset;oh(s,e)<0&&(e=s),t<s.largestBatchId&&(t=s.largestBatchId)}return new kt(e.readTime,e.documentKey,t)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ln{constructor(e){this.ys=e}next(){return this.ys+=2,this.ys}static ws(){return new Ln(0)}static bs(){return new Ln(-1)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ib{constructor(e,t){this.referenceDelegate=e,this.serializer=t}allocateTargetId(e){return this.Ss(e).next((t=>{const n=new Ln(t.highestTargetId);return t.highestTargetId=n.next(),this.vs(e,t).next((()=>t.highestTargetId))}))}getLastRemoteSnapshotVersion(e){return this.Ss(e).next((t=>X.fromTimestamp(new ge(t.lastRemoteSnapshotVersion.seconds,t.lastRemoteSnapshotVersion.nanoseconds))))}getHighestSequenceNumber(e){return this.Ss(e).next((t=>t.highestListenSequenceNumber))}setTargetsMetadata(e,t,n){return this.Ss(e).next((s=>(s.highestListenSequenceNumber=t,n&&(s.lastRemoteSnapshotVersion=n.toTimestamp()),t>s.highestListenSequenceNumber&&(s.highestListenSequenceNumber=t),this.vs(e,s))))}addTargetData(e,t){return this.Ds(e,t).next((()=>this.Ss(e).next((n=>(n.targetCount+=1,this.xs(t,n),this.vs(e,n))))))}updateTargetData(e,t){return this.Ds(e,t)}removeTargetData(e,t){return this.removeMatchingKeysForTargetId(e,t.targetId).next((()=>ks(e).delete(t.targetId))).next((()=>this.Ss(e))).next((n=>(H(n.targetCount>0,8065),n.targetCount-=1,this.vs(e,n))))}removeTargets(e,t,n){let s=0;const i=[];return ks(e).Hn(((o,a)=>{const c=uo(this.serializer,a);c.sequenceNumber<=t&&n.get(c.targetId)===null&&(s++,i.push(this.removeTargetData(e,c)))})).next((()=>b.waitFor(i))).next((()=>s))}forEachTarget(e,t){return ks(e).Hn(((n,s)=>{const i=uo(this.serializer,s);t(i)}))}Ss(e){return kC(e).get(xc).next((t=>(H(t!==null,2888),t)))}vs(e,t){return kC(e).put(xc,t)}Ds(e,t){return ks(e).put(EE(this.serializer,t))}xs(e,t){let n=!1;return e.targetId>t.highestTargetId&&(t.highestTargetId=e.targetId,n=!0),e.sequenceNumber>t.highestListenSequenceNumber&&(t.highestListenSequenceNumber=e.sequenceNumber,n=!0),n}getTargetCount(e){return this.Ss(e).next((t=>t.targetCount))}getTargetData(e,t){const n=yu(t),s=IDBKeyRange.bound([n,Number.NEGATIVE_INFINITY],[n,Number.POSITIVE_INFINITY]);let i=null;return ks(e).Hn({range:s,index:lE},((o,a,c)=>{const l=uo(this.serializer,a);Oh(t,l.target)&&(i=l,c.done())})).next((()=>i))}addMatchingKeys(e,t,n){const s=[],i=tr(e);return t.forEach((o=>{const a=it(o.path);s.push(i.put({targetId:n,path:a})),s.push(this.referenceDelegate.addReference(e,n,o))})),b.waitFor(s)}removeMatchingKeys(e,t,n){const s=tr(e);return b.forEach(t,(i=>{const o=it(i.path);return b.waitFor([s.delete([n,o]),this.referenceDelegate.removeReference(e,n,i)])}))}removeMatchingKeysForTargetId(e,t){const n=tr(e),s=IDBKeyRange.bound([t],[t+1],!1,!0);return n.delete(s)}getMatchingKeysForTargetId(e,t){const n=IDBKeyRange.bound([t],[t+1],!1,!0),s=tr(e);let i=ae();return s.Hn({range:n,jn:!0},((o,a,c)=>{const l=ln(o[1]),B=new K(l);i=i.add(B)})).next((()=>i))}containsKey(e,t){const n=it(t.path),s=IDBKeyRange.bound([n],[Om(n)],!1,!0);let i=0;return tr(e).Hn({index:kh,jn:!0,range:s},(([o,a],c,l)=>{o!==0&&(i++,l.done())})).next((()=>i>0))}ye(e,t){return ks(e).get(t).next((n=>n?uo(this.serializer,n):null))}}function ks(r){return qe(r,li)}function kC(r){return qe(r,ns)}function tr(r){return qe(r,Bi)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Db{constructor(e,t){this.db=e,this.garbageCollector=V_(this,t)}ir(e){const t=this.Cs(e);return this.db.getTargetCache().getTargetCount(e).next((n=>t.next((s=>n+s))))}Cs(e){let t=0;return this.sr(e,(n=>{t++})).next((()=>t))}forEachTarget(e,t){return this.db.getTargetCache().forEachTarget(e,t)}sr(e,t){return this.Fs(e,((n,s)=>t(s)))}addReference(e,t,n){return Qa(e,n)}removeReference(e,t,n){return Qa(e,n)}removeTargets(e,t,n){return this.db.getTargetCache().removeTargets(e,t,n)}markPotentiallyOrphaned(e,t){return Qa(e,t)}Os(e,t){return(function(s,i){let o=!1;return yE(s).Jn((a=>DE(s,a,i).next((c=>(c&&(o=!0),b.resolve(!c)))))).next((()=>o))})(e,t)}removeOrphanedDocuments(e,t){const n=this.db.getRemoteDocumentCache().newChangeBuffer(),s=[];let i=0;return this.Fs(e,((o,a)=>{if(a<=t){const c=this.Os(e,o).next((l=>{if(!l)return i++,n.getEntry(e,o).next((()=>(n.removeEntry(o,X.min()),tr(e).delete((function(f){return[0,it(f.path)]})(o)))))}));s.push(c)}})).next((()=>b.waitFor(s))).next((()=>n.apply(e))).next((()=>i))}removeTarget(e,t){const n=t.withSequenceNumber(e.currentSequenceNumber);return this.db.getTargetCache().updateTargetData(e,n)}updateLimboDocument(e,t){return Qa(e,t)}Fs(e,t){const n=tr(e);let s,i=Et.wn;return n.Hn({index:kh},(([o,a],{path:c,sequenceNumber:l})=>{o===0?(i!==Et.wn&&t(new K(ln(s)),i),i=l,s=c):i=Et.wn})).next((()=>{i!==Et.wn&&t(new K(ln(s)),i)}))}getCacheSize(e){return this.db.getRemoteDocumentCache().getSize(e)}}function Qa(r,e){return tr(r).put((function(n,s){return{targetId:0,path:it(n.path),sequenceNumber:s}})(e,r.currentSequenceNumber))}// Copyright 2024 Google LLC* @license
function AE(r,e){let t=e;for(const n of r.stages)t=yb({serializer:r.serializer,serverTimestampBehavior:r.listenOptions?.serverTimestampBehavior},n,t);return t}function bu(r,e){return AE(r,[e]).length>0}function vE(r,e){return Pe(r)?bu(r,e):du(r,e)}function yb(r,e,t){if(e instanceof ua)return(function(s,i,o){return o.filter((a=>a.isFoundDocument()&&`/${a.key.getCollectionPath().canonicalString()}`===i.hr))})(0,e,t);if(e instanceof Ba)return(function(s,i,o){return o.filter((a=>{const c=_o(re(i.condition).evaluate(s,a));return c!==void 0&&jt(c,yt)}))})(r,e,t);if(e instanceof la)return(function(s,i,o){return o.filter((a=>a.isFoundDocument()&&a.key.getCollectionPath().lastSegment()===i.collectionId))})(0,e,t);if(e instanceof _u)return(function(s,i,o){return o.filter((a=>a.isFoundDocument()))})(0,0,t);if(e instanceof Eu)return(function(s,i,o){return o.filter((a=>a.isFoundDocument()&&i.Pr.has(a.key.path.toStringWithLeadingSlash())))})(0,e,t);if(e instanceof Ir)return(function(s,i,o){return o.slice(0,i.limit)})(0,e,t);if(e instanceof un)return(function(s,i,o){const a=i.orderings.map((c=>({Ms:re(c.expr),direction:c.direction})));return[...o].sort(((c,l)=>{for(const{Ms:B,direction:f}of a){const p=_o(B.evaluate(s,c)),m=_o(B.evaluate(s,l)),y=at(p??fn,m??fn);if(y!==0)return f==="ascending"?y:-y}return 0}))})(r,e,t);throw new Error(`Unknown stage: ${e._name}`)}function wB(r){const e=(function(n){for(let s=n.stages.length-1;s>=0;s--){const i=n.stages[s];if(i instanceof un)return i.orderings}throw new Error("Pipeline must contain at least one Sort stage")})(r);return(t,n)=>{for(const s of e){const i=_o(re(s.expr).evaluate({serializer:r.serializer},t)),o=_o(re(s.expr).evaluate({serializer:r.serializer},n)),a=at(i||fn,o||fn);if(a!==0)return s.direction==="ascending"?a:-a}return 0}}function vl(r){for(let e=r.stages.length-1;e>=0;e--){const t=r.stages[e];if(t instanceof Ir)return{limit:t.limit}}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class RE{constructor(){this.changes=new Gn((e=>e.toString()),((e,t)=>e.isEqual(t))),this.changesApplied=!1}addEntry(e){this.assertNotApplied(),this.changes.set(e.key,e)}removeEntry(e,t){this.assertNotApplied(),this.changes.set(e,Ae.newInvalidDocument(e).setReadTime(t))}getEntry(e,t){this.assertNotApplied();const n=this.changes.get(t);return n!==void 0?b.resolve(n):this.getFromCache(e,t)}getEntries(e,t){return this.getAllFromCache(e,t)}apply(e){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(e)}assertNotApplied(){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tb{constructor(e){this.serializer=e}setIndexManager(e){this.indexManager=e}addEntry(e,t,n){return Yn(e).put(n)}removeEntry(e,t,n){return Yn(e).delete((function(i,o){const a=i.path.toArray();return[a.slice(0,a.length-2),a[a.length-2],Mc(o),a[a.length-1]]})(t,n))}updateMetadata(e,t){return this.getMetadata(e).next((n=>(n.byteSize+=t,this.Ns(e,n))))}getEntry(e,t){let n=Ae.newInvalidDocument(t);return Yn(e).Hn({index:Bc,range:IDBKeyRange.only(eo(t))},((s,i)=>{n=this.Ls(t,i)})).next((()=>n))}Bs(e,t){let n={size:0,document:Ae.newInvalidDocument(t)};return Yn(e).Hn({index:Bc,range:IDBKeyRange.only(eo(t))},((s,i)=>{n={document:this.Ls(t,i),size:Vc(i)}})).next((()=>n))}getEntries(e,t){let n=Me();return this.Us(e,t,((s,i)=>{const o=this.Ls(s,i);n=n.insert(s,o)})).next((()=>n))}getAllEntries(e){let t=Me();return Yn(e).Hn(((n,s)=>{const i=this.Ls(K.fromSegments(s.prefixPath.concat(s.collectionGroup,s.documentId)),s);t=t.insert(i.key,i)})).next((()=>t))}ks(e,t){let n=Me(),s=new Ie(K.comparator);return this.Us(e,t,((i,o)=>{const a=this.Ls(i,o);n=n.insert(i,a),s=s.insert(i,Vc(o))})).next((()=>({documents:n,qs:s})))}Us(e,t,n){if(t.isEmpty())return b.resolve();let s=new me(MC);t.forEach((c=>s=s.add(c)));const i=IDBKeyRange.bound(eo(s.first()),eo(s.last())),o=s.getIterator();let a=o.getNext();return Yn(e).Hn({index:Bc,range:i},((c,l,B)=>{const f=K.fromSegments([...l.prefixPath,l.collectionGroup,l.documentId]);for(;a&&MC(a,f)<0;)n(a,null),a=o.getNext();a&&a.isEqual(f)&&(n(a,l),a=o.hasNext()?o.getNext():null),a?B.Kn(eo(a)):B.done()})).next((()=>{for(;a;)n(a,null),a=o.hasNext()?o.getNext():null}))}getDocumentsMatchingQuery(e,t,n,s,i){const o=Pe(t)?le.fromString(ha(t)):t.path,a=[o.popLast().toArray(),o.lastSegment(),Mc(n.readTime),n.documentKey.path.isEmpty()?"":n.documentKey.path.lastSegment()],c=[o.popLast().toArray(),o.lastSegment(),[Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER],""];return Yn(e).Qn(IDBKeyRange.bound(a,c,!0)).next((l=>{i?.incrementDocumentReadCount(l.length);let B=Me();for(const f of l){const p=this.Ls(K.fromSegments(f.prefixPath.concat(f.collectionGroup,f.documentId)),f);p.isFoundDocument()&&(vE(t,p)||s.has(p.key))&&(B=B.insert(p.key,p))}return B}))}getAllFromCollectionGroup(e,t,n,s){let i=Me();const o=VC(t,n),a=VC(t,kt.max());return Yn(e).Hn({index:uE,range:IDBKeyRange.bound(o,a,!0)},((c,l,B)=>{const f=this.Ls(K.fromSegments(l.prefixPath.concat(l.collectionGroup,l.documentId)),l);i=i.insert(f.key,f),i.size===s&&B.done()})).next((()=>i))}newChangeBuffer(e){return new wb(this,!!e&&e.trackRemovals)}getSize(e){return this.getMetadata(e).next((t=>t.byteSize))}getMetadata(e){return xC(e).get(gB).next((t=>(H(!!t,20021),t)))}Ns(e,t){return xC(e).put(gB,t)}Ls(e,t){if(t){const n=lb(this.serializer,t);if(!(n.isNoDocument()&&n.version.isEqual(X.min())))return n}return Ae.newInvalidDocument(e)}}function bE(r){return new Tb(r)}class wb extends RE{constructor(e,t){super(),this.$s=e,this.trackRemovals=t,this.Ks=new Gn((n=>n.toString()),((n,s)=>n.isEqual(s)))}applyChanges(e){const t=[];let n=0,s=new me(((i,o)=>ie(i.canonicalString(),o.canonicalString())));return this.changes.forEach(((i,o)=>{const a=this.Ks.get(i);if(t.push(this.$s.removeEntry(e,i,a.readTime)),o.isValidDocument()){const c=yC(this.$s.serializer,o);s=s.add(i.path.popLast());const l=Vc(c);n+=l-a.size,t.push(this.$s.addEntry(e,i,c))}else if(n-=a.size,this.trackRemovals){const c=yC(this.$s.serializer,o.convertToNoDocument(X.min()));t.push(this.$s.addEntry(e,i,c))}})),s.forEach((i=>{t.push(this.$s.indexManager.addToCollectionParentIndex(e,i))})),t.push(this.$s.updateMetadata(e,n)),b.waitFor(t)}getFromCache(e,t){return this.$s.Bs(e,t).next((n=>(this.Ks.set(t,{size:n.size,readTime:n.document.readTime}),n.document)))}getAllFromCache(e,t){return this.$s.ks(e,t).next((({documents:n,qs:s})=>(s.forEach(((i,o)=>{this.Ks.set(i,{size:o,readTime:n.get(i).readTime})})),n)))}}function xC(r){return qe(r,Ko)}function Yn(r){return qe(r,kc)}function eo(r){const e=r.path.toArray();return[e.slice(0,e.length-2),e[e.length-2],e[e.length-1]]}function VC(r,e){const t=e.documentKey.path.toArray();return[r,Mc(e.readTime),t.slice(0,t.length-2),t.length>0?t[t.length-1]:""]}function MC(r,e){const t=r.path.toArray(),n=e.path.toArray();let s=0;for(let i=0;i<t.length-2&&i<n.length-2;++i)if(s=ie(t[i],n[i]),s)return s;return s=ie(t.length,n.length),s||(s=ie(t[t.length-2],n[n.length-2]),s||ie(t[t.length-1],n[n.length-1]))}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ab{constructor(e,t){this.overlayedDocument=e,this.mutatedFields=t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class SE{constructor(e,t,n,s){this.remoteDocumentCache=e,this.mutationQueue=t,this.documentOverlayCache=n,this.indexManager=s}getDocument(e,t){let n=null;return this.documentOverlayCache.getOverlay(e,t).next((s=>(n=s,this.remoteDocumentCache.getEntry(e,t)))).next((s=>(n!==null&&ho(n.mutation,s,_t.empty(),ge.now()),s)))}getDocuments(e,t){return this.remoteDocumentCache.getEntries(e,t).next((n=>this.getLocalViewOfDocuments(e,n,ae()).next((()=>n))))}getLocalViewOfDocuments(e,t,n=ae()){const s=Ht();return this.populateOverlays(e,s,t).next((()=>this.computeViews(e,t,s,n).next((i=>{let o=jr();return i.forEach(((a,c)=>{o=o.insert(a,c.overlayedDocument)})),o}))))}getOverlayedDocuments(e,t){const n=Ht();return this.populateOverlays(e,n,t).next((()=>this.computeViews(e,t,n,ae())))}populateOverlays(e,t,n){const s=[];return n.forEach((i=>{t.has(i)||s.push(i)})),this.documentOverlayCache.getOverlays(e,s).next((i=>{i.forEach(((o,a)=>{t.set(o,a)}))}))}computeViews(e,t,n,s){let i=Me();const o=Co(),a=(function(){return Co()})();return t.forEach(((c,l)=>{const B=n.get(l.key);s.has(l.key)&&(B===void 0||B.mutation instanceof Mn)?i=i.insert(l.key,l):B!==void 0?(o.set(l.key,B.mutation.getFieldMask()),ho(B.mutation,l,B.mutation.getFieldMask(),ge.now())):o.set(l.key,_t.empty())})),this.recalculateAndSaveOverlays(e,i).next((c=>(c.forEach(((l,B)=>o.set(l,B))),t.forEach(((l,B)=>a.set(l,new Ab(B,o.get(l)??null)))),a)))}recalculateAndSaveOverlays(e,t){const n=Co();let s=new Ie(((o,a)=>o-a)),i=ae();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e,t).next((o=>{for(const a of o)a.keys().forEach((c=>{const l=t.get(c);if(l===null)return;let B=n.get(c)||_t.empty();B=a.applyToLocalView(l,B),n.set(c,B);const f=(s.get(a.batchId)||ae()).add(c);s=s.insert(a.batchId,f)}))})).next((()=>{const o=[],a=s.getReverseIterator();for(;a.hasNext();){const c=a.getNext(),l=c.key,B=c.value,f=f_();B.forEach((p=>{if(!i.has(p)){const m=Wm(t.get(p),n.get(p));m!==null&&f.set(p,m),i=i.add(p)}})),o.push(this.documentOverlayCache.saveOverlays(e,l,f))}return b.waitFor(o)})).next((()=>n))}recalculateAndSaveOverlaysForDocumentKeys(e,t){return this.remoteDocumentCache.getEntries(e,t).next((n=>this.recalculateAndSaveOverlays(e,n)))}getDocumentsMatchingQuery(e,t,n,s){return Pe(t)?this.getDocumentsMatchingPipeline(e,t,n,s):lA(t)?this.getDocumentsMatchingDocumentQuery(e,t.path):c_(t)?this.getDocumentsMatchingCollectionGroupQuery(e,t,n,s):this.getDocumentsMatchingCollectionQuery(e,t,n,s)}getNextDocuments(e,t,n,s){return this.remoteDocumentCache.getAllFromCollectionGroup(e,t,n,s).next((i=>{const o=s-i.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(e,t,n.largestBatchId,s-i.size):b.resolve(Ht());let a=ai,c=i;return o.next((l=>b.forEach(l,((B,f)=>(a<f.largestBatchId&&(a=f.largestBatchId),i.get(B)?b.resolve():this.remoteDocumentCache.getEntry(e,B).next((p=>{c=c.insert(B,p)}))))).next((()=>this.populateOverlays(e,l,i))).next((()=>this.computeViews(e,c,l,ae()))).next((B=>({batchId:a,changes:h_(B)})))))}))}getDocumentsMatchingDocumentQuery(e,t){return this.getDocument(e,new K(t)).next((n=>{let s=jr();return n.isFoundDocument()&&(s=s.insert(n.key,n)),s}))}getDocumentsMatchingCollectionGroupQuery(e,t,n,s){const i=t.collectionGroup;let o=jr();return this.indexManager.getCollectionParents(e,i).next((a=>b.forEach(a,(c=>{const l=(function(f,p){return new Di(p,null,f.explicitOrderBy.slice(),f.filters.slice(),f.limit,f.limitType,f.startAt,f.endAt)})(t,c.child(i));return this.getDocumentsMatchingCollectionQuery(e,l,n,s).next((B=>{B.forEach(((f,p)=>{o=o.insert(f,p)}))}))})).next((()=>o))))}getDocumentsMatchingCollectionQuery(e,t,n,s){let i;return this.documentOverlayCache.getOverlaysForCollection(e,t.path,n.largestBatchId).next((o=>(i=o,this.remoteDocumentCache.getDocumentsMatchingQuery(e,t,n,i,s)))).next((o=>this.retrieveMatchingLocalDocuments(i,o,(a=>du(t,a)))))}getDocumentsMatchingPipeline(e,t,n,s){if(vn(t)==="collection_group"){const i=Ah(t);let o=jr();return this.indexManager.getCollectionParents(e,i).next((a=>b.forEach(a,(c=>{const l=(function(f,p){const m=f.stages.map((y=>y instanceof la?new ua(p.canonicalString(),{}):y));return new st(f.serializer,m)})(t,c.child(i));return this.getDocumentsMatchingPipeline(e,l,n,s).next((B=>{B.forEach(((f,p)=>{o=o.insert(f,p)}))}))})).next((()=>o))))}{let i;return this.getOverlaysForPipeline(e,t,n.largestBatchId).next((o=>{switch(i=o,vn(t)){case"collection":return this.remoteDocumentCache.getDocumentsMatchingQuery(e,t,n,i,s);case"documents":let a=ae();for(const c of Oc(t))a=a.add(K.fromPath(c));return this.remoteDocumentCache.getEntries(e,a);case"database":return this.remoteDocumentCache.getAllEntries(e);default:throw new U("invalid-argument",`Invalid pipeline source to execute offline: ${Rn(t)}`)}})).next((o=>this.retrieveMatchingLocalDocuments(i,o,(a=>bu(t,a)))))}}retrieveMatchingLocalDocuments(e,t,n){e.forEach(((i,o)=>{const a=o.getKey();t.get(a)===null&&(t=t.insert(a,Ae.newInvalidDocument(a)))}));let s=jr();return t.forEach(((i,o)=>{const a=e.get(i);a!==void 0&&ho(a.mutation,o,_t.empty(),ge.now()),n(o)&&(s=s.insert(i,o))})),s}getOverlaysForPipeline(e,t,n){switch(vn(t)){case"collection":return this.documentOverlayCache.getOverlaysForCollection(e,le.fromString(ha(t)),n);case"collection_group":throw new U("invalid-argument",`Unexpected collection group pipeline: ${Rn(t)}`);case"documents":return this.documentOverlayCache.getOverlays(e,Oc(t).map((s=>K.fromPath(s))));case"database":return this.documentOverlayCache.getAllOverlays(e,n);default:throw new U("invalid-argument",`Failed to get overlays for pipeline: ${Rn(t)}`)}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vb{constructor(e){this.serializer=e,this.Qs=new Map,this.Ws=new Map}getBundleMetadata(e,t){return b.resolve(this.Qs.get(t))}saveBundleMetadata(e,t){return this.Qs.set(t.id,(function(s){return{id:s.id,version:s.version,createTime:We(s.createTime)}})(t)),b.resolve()}getNamedQuery(e,t){return b.resolve(this.Ws.get(t))}saveNamedQuery(e,t){return this.Ws.set(t.name,(function(s){return{name:s.name,query:IE(s.bundledQuery),readTime:We(s.readTime)}})(t)),b.resolve()}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Rb{constructor(){this.overlays=new Ie(K.comparator),this.Gs=new Map}getOverlay(e,t){return b.resolve(this.overlays.get(t))}getOverlays(e,t){const n=Ht();return b.forEach(t,(s=>this.getOverlay(e,s).next((i=>{i!==null&&n.set(s,i)})))).next((()=>n))}getAllOverlays(e,t){const n=Ht();return this.overlays.forEach(((s,i)=>{i.largestBatchId>t&&n.set(s,i)})),b.resolve(n)}saveOverlays(e,t,n){return n.forEach(((s,i)=>{this.Zr(e,t,i)})),b.resolve()}removeOverlaysForBatchId(e,t,n){const s=this.Gs.get(n);return s!==void 0&&(s.forEach((i=>this.overlays=this.overlays.remove(i))),this.Gs.delete(n)),b.resolve()}getOverlaysForCollection(e,t,n){const s=Ht(),i=t.length+1,o=new K(t.child("")),a=this.overlays.getIteratorFrom(o);for(;a.hasNext();){const c=a.getNext().value,l=c.getKey();if(!t.isPrefixOf(l.path))break;l.path.length===i&&c.largestBatchId>n&&s.set(c.getKey(),c)}return b.resolve(s)}getOverlaysForCollectionGroup(e,t,n,s){let i=new Ie(((l,B)=>l-B));const o=this.overlays.getIterator();for(;o.hasNext();){const l=o.getNext().value;if(l.getKey().getCollectionGroup()===t&&l.largestBatchId>n){let B=i.get(l.largestBatchId);B===null&&(B=Ht(),i=i.insert(l.largestBatchId,B)),B.set(l.getKey(),l)}}const a=Ht(),c=i.getIterator();for(;c.hasNext()&&(c.getNext().value.forEach(((l,B)=>a.set(l,B))),!(a.size()>=s)););return b.resolve(a)}Zr(e,t,n){const s=this.overlays.get(n.key);if(s!==null){const o=this.Gs.get(s.largestBatchId).delete(n.key);this.Gs.set(s.largestBatchId,o)}this.overlays=this.overlays.insert(n.key,new Gh(t,n));let i=this.Gs.get(t);i===void 0&&(i=ae(),this.Gs.set(t,i)),this.Gs.set(t,i.add(n.key))}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class bb{constructor(){this.sessionToken=be.EMPTY_BYTE_STRING}getSessionToken(e){return b.resolve(this.sessionToken)}setSessionToken(e,t){return this.sessionToken=t,b.resolve()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qh{constructor(){this.zs=new me(Je.js),this.Hs=new me(Je.Js)}isEmpty(){return this.zs.isEmpty()}addReference(e,t){const n=new Je(e,t);this.zs=this.zs.add(n),this.Hs=this.Hs.add(n)}Ys(e,t){e.forEach((n=>this.addReference(n,t)))}removeReference(e,t){this.Zs(new Je(e,t))}Xs(e,t){e.forEach((n=>this.removeReference(n,t)))}e_(e){const t=new K(new le([])),n=new Je(t,e),s=new Je(t,e+1),i=[];return this.Hs.forEachInRange([n,s],(o=>{this.Zs(o),i.push(o.key)})),i}t_(){this.zs.forEach((e=>this.Zs(e)))}Zs(e){this.zs=this.zs.delete(e),this.Hs=this.Hs.delete(e)}n_(e){const t=new K(new le([])),n=new Je(t,e),s=new Je(t,e+1);let i=ae();return this.Hs.forEachInRange([n,s],(o=>{i=i.add(o.key)})),i}containsKey(e){const t=new Je(e,0),n=this.zs.firstAfterOrEqual(t);return n!==null&&e.isEqual(n.key)}}class Je{constructor(e,t){this.key=e,this.r_=t}static js(e,t){return K.comparator(e.key,t.key)||ie(e.r_,t.r_)}static Js(e,t){return ie(e.r_,t.r_)||K.comparator(e.key,t.key)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Sb{constructor(e,t){this.indexManager=e,this.referenceDelegate=t,this.mutationQueue=[],this.Gr=1,this.i_=new me(Je.js)}checkEmpty(e){return b.resolve(this.mutationQueue.length===0)}addMutationBatch(e,t,n,s){const i=this.Gr;this.Gr++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const o=new Fh(i,t,n,s);this.mutationQueue.push(o);for(const a of s)this.i_=this.i_.add(new Je(a.key,i)),this.indexManager.addToCollectionParentIndex(e,a.key.path.popLast());return b.resolve(o)}lookupMutationBatch(e,t){return b.resolve(this.s_(t))}getNextMutationBatchAfterBatchId(e,t){const n=t+1,s=this.__(n),i=s<0?0:s;return b.resolve(this.mutationQueue.length>i?this.mutationQueue[i]:null)}getHighestUnacknowledgedBatchId(){return b.resolve(this.mutationQueue.length===0?Zr:this.Gr-1)}getAllMutationBatches(e){return b.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(e,t){const n=new Je(t,0),s=new Je(t,Number.POSITIVE_INFINITY),i=[];return this.i_.forEachInRange([n,s],(o=>{const a=this.s_(o.r_);i.push(a)})),b.resolve(i)}getAllMutationBatchesAffectingDocumentKeys(e,t){let n=new me(ie);return t.forEach((s=>{const i=new Je(s,0),o=new Je(s,Number.POSITIVE_INFINITY);this.i_.forEachInRange([i,o],(a=>{n=n.add(a.r_)}))})),b.resolve(this.o_(n))}getAllMutationBatchesAffectingQuery(e,t){const n=t.path,s=n.length+1;let i=n;K.isDocumentKey(i)||(i=i.child(""));const o=new Je(new K(i),0);let a=new me(ie);return this.i_.forEachWhile((c=>{const l=c.key.path;return!!n.isPrefixOf(l)&&(l.length===s&&(a=a.add(c.r_)),!0)}),o),b.resolve(this.o_(a))}o_(e){const t=[];return e.forEach((n=>{const s=this.s_(n);s!==null&&t.push(s)})),t}removeMutationBatch(e,t){H(this.a_(t.batchId,"removed")===0,55003),this.mutationQueue.shift();let n=this.i_;return b.forEach(t.mutations,(s=>{const i=new Je(s.key,t.batchId);return n=n.delete(i),this.referenceDelegate.markPotentiallyOrphaned(e,s.key)})).next((()=>{this.i_=n}))}Hr(e){}containsKey(e,t){const n=new Je(t,0),s=this.i_.firstAfterOrEqual(n);return b.resolve(t.isEqual(s&&s.key))}performConsistencyCheck(e){return this.mutationQueue.length,b.resolve()}a_(e,t){return this.__(e)}__(e){return this.mutationQueue.length===0?0:e-this.mutationQueue[0].batchId}s_(e){const t=this.__(e);return t<0||t>=this.mutationQueue.length?null:this.mutationQueue[t]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Pb{constructor(e){this.u_=e,this.docs=(function(){return new Ie(K.comparator)})(),this.size=0}setIndexManager(e){this.indexManager=e}addEntry(e,t){const n=t.key,s=this.docs.get(n),i=s?s.size:0,o=this.u_(t);return this.docs=this.docs.insert(n,{document:t.mutableCopy(),size:o}),this.size+=o-i,this.indexManager.addToCollectionParentIndex(e,n.path.popLast())}removeEntry(e){const t=this.docs.get(e);t&&(this.docs=this.docs.remove(e),this.size-=t.size)}getEntry(e,t){const n=this.docs.get(t);return b.resolve(n?n.document.mutableCopy():Ae.newInvalidDocument(t))}getEntries(e,t){let n=Me();return t.forEach((s=>{const i=this.docs.get(s);n=n.insert(s,i?i.document.mutableCopy():Ae.newInvalidDocument(s))})),b.resolve(n)}getAllEntries(e){let t=Me();return this.docs.forEach(((n,s)=>{t=t.insert(n,s.document)})),b.resolve(t)}getDocumentsMatchingQuery(e,t,n,s){let i,o;Pe(t)?(i=le.fromString(ha(t)),o=B=>bu(t,B)):(i=t.path,o=B=>du(t,B));let a=Me();const c=new K(i.child("__id-9223372036854775808__")),l=this.docs.getIteratorFrom(c);for(;l.hasNext();){const{key:B,value:{document:f}}=l.getNext();if(!i.isPrefixOf(B.path))break;B.path.length>i.length+1||oh(o_(f),n)<=0||(s.has(f.key)||o(f))&&(a=a.insert(f.key,f.mutableCopy()))}return b.resolve(a)}getAllFromCollectionGroup(e,t,n,s){z(9500)}c_(e,t){return b.forEach(this.docs,(n=>t(n)))}newChangeBuffer(e){return new Nb(this)}getSize(e){return b.resolve(this.size)}}class Nb extends RE{constructor(e){super(),this.$s=e}applyChanges(e){const t=[];return this.changes.forEach(((n,s)=>{s.isValidDocument()?t.push(this.$s.addEntry(e,s)):this.$s.removeEntry(n)})),b.waitFor(t)}getFromCache(e,t){return this.$s.getEntry(e,t)}getAllFromCache(e,t){return this.$s.getEntries(e,t)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ob{constructor(e){this.persistence=e,this.l_=new Gn((t=>yu(t)),Oh),this.lastRemoteSnapshotVersion=X.min(),this.highestTargetId=0,this.E_=0,this.h_=new qh,this.targetCount=0,this.T_=Ln.ws()}forEachTarget(e,t){return this.l_.forEach(((n,s)=>t(s))),b.resolve()}getLastRemoteSnapshotVersion(e){return b.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(e){return b.resolve(this.E_)}allocateTargetId(e){return this.highestTargetId=this.T_.next(),b.resolve(this.highestTargetId)}setTargetsMetadata(e,t,n){return n&&(this.lastRemoteSnapshotVersion=n),t>this.E_&&(this.E_=t),b.resolve()}Ds(e){this.l_.set(e.target,e);const t=e.targetId;t>this.highestTargetId&&(this.T_=new Ln(t),this.highestTargetId=t),e.sequenceNumber>this.E_&&(this.E_=e.sequenceNumber)}addTargetData(e,t){return this.Ds(t),this.targetCount+=1,b.resolve()}updateTargetData(e,t){return this.Ds(t),b.resolve()}removeTargetData(e,t){return this.l_.delete(t.target),this.h_.e_(t.targetId),this.targetCount-=1,b.resolve()}removeTargets(e,t,n){let s=0;const i=[];return this.l_.forEach(((o,a)=>{a.sequenceNumber<=t&&n.get(a.targetId)===null&&(this.l_.delete(o),i.push(this.removeMatchingKeysForTargetId(e,a.targetId)),s++)})),b.waitFor(i).next((()=>s))}getTargetCount(e){return b.resolve(this.targetCount)}getTargetData(e,t){const n=this.l_.get(t)||null;return b.resolve(n)}addMatchingKeys(e,t,n){return this.h_.Ys(t,n),b.resolve()}removeMatchingKeys(e,t,n){this.h_.Xs(t,n);const s=this.persistence.referenceDelegate,i=[];return s&&t.forEach((o=>{i.push(s.markPotentiallyOrphaned(e,o))})),b.waitFor(i)}removeMatchingKeysForTargetId(e,t){return this.h_.e_(t),b.resolve()}getMatchingKeysForTargetId(e,t){const n=this.h_.n_(t);return b.resolve(n)}containsKey(e,t){return b.resolve(this.h_.containsKey(t))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jh{constructor(e,t){this.P_={},this.overlays={},this.I_=new Et(0),this.R_=!1,this.R_=!0,this.A_=new bb,this.referenceDelegate=e(this),this.V_=new Ob(this),this.indexManager=new _b,this.remoteDocumentCache=(function(s){return new Pb(s)})((n=>this.referenceDelegate.d_(n))),this.serializer=new _E(t),this.f_=new vb(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.R_=!1,Promise.resolve()}get started(){return this.R_}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(e){return this.indexManager}getDocumentOverlayCache(e){let t=this.overlays[e.toKey()];return t||(t=new Rb,this.overlays[e.toKey()]=t),t}getMutationQueue(e,t){let n=this.P_[e.toKey()];return n||(n=new Sb(t,this.referenceDelegate),this.P_[e.toKey()]=n),n}getGlobalsCache(){return this.A_}getTargetCache(){return this.V_}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.f_}runTransaction(e,t,n){G("MemoryPersistence","Starting transaction:",e);const s=new Fb(this.I_.next());return this.referenceDelegate.m_(),n(s).next((i=>this.referenceDelegate.p_(s).next((()=>i)))).toPromise().then((i=>(s.raiseOnCommittedEvent(),i)))}g_(e,t){return b.or(Object.values(this.P_).map((n=>()=>n.containsKey(e,t))))}}class Fb extends F_{constructor(e){super(),this.currentSequenceNumber=e}}class Su{constructor(e){this.persistence=e,this.y_=new qh,this.w_=null}static b_(e){return new Su(e)}get S_(){if(this.w_)return this.w_;throw z(60996)}addReference(e,t,n){return this.y_.addReference(n,t),this.S_.delete(n.toString()),b.resolve()}removeReference(e,t,n){return this.y_.removeReference(n,t),this.S_.add(n.toString()),b.resolve()}markPotentiallyOrphaned(e,t){return this.S_.add(t.toString()),b.resolve()}removeTarget(e,t){this.y_.e_(t.targetId).forEach((s=>this.S_.add(s.toString())));const n=this.persistence.getTargetCache();return n.getMatchingKeysForTargetId(e,t.targetId).next((s=>{s.forEach((i=>this.S_.add(i.toString())))})).next((()=>n.removeTargetData(e,t)))}m_(){this.w_=new Set}p_(e){const t=this.persistence.getRemoteDocumentCache().newChangeBuffer();return b.forEach(this.S_,(n=>{const s=K.fromPath(n);return this.v_(e,s).next((i=>{i||t.removeEntry(s,X.min())}))})).next((()=>(this.w_=null,t.apply(e))))}updateLimboDocument(e,t){return this.v_(e,t).next((n=>{n?this.S_.delete(t.toString()):this.S_.add(t.toString())}))}d_(e){return 0}v_(e,t){return b.or([()=>b.resolve(this.y_.containsKey(t)),()=>this.persistence.getTargetCache().containsKey(e,t),()=>this.persistence.g_(e,t)])}}class Uc{constructor(e,t){this.persistence=e,this.D_=new Gn((n=>it(n.path)),((n,s)=>n.isEqual(s))),this.garbageCollector=V_(this,t)}static b_(e,t){return new Uc(e,t)}m_(){}p_(e){return b.resolve()}forEachTarget(e,t){return this.persistence.getTargetCache().forEachTarget(e,t)}ir(e){const t=this.Cs(e);return this.persistence.getTargetCache().getTargetCount(e).next((n=>t.next((s=>n+s))))}Cs(e){let t=0;return this.sr(e,(n=>{t++})).next((()=>t))}sr(e,t){return b.forEach(this.D_,((n,s)=>this.Os(e,n,s).next((i=>i?b.resolve():t(s)))))}removeTargets(e,t,n){return this.persistence.getTargetCache().removeTargets(e,t,n)}removeOrphanedDocuments(e,t){let n=0;const s=this.persistence.getRemoteDocumentCache(),i=s.newChangeBuffer();return s.c_(e,(o=>this.Os(e,o,t).next((a=>{a||(n++,i.removeEntry(o,X.min()))})))).next((()=>i.apply(e))).next((()=>n))}markPotentiallyOrphaned(e,t){return this.D_.set(t,e.currentSequenceNumber),b.resolve()}removeTarget(e,t){const n=t.withSequenceNumber(e.currentSequenceNumber);return this.persistence.getTargetCache().updateTargetData(e,n)}addReference(e,t,n){return this.D_.set(n,e.currentSequenceNumber),b.resolve()}removeReference(e,t,n){return this.D_.set(n,e.currentSequenceNumber),b.resolve()}updateLimboDocument(e,t){return this.D_.set(t,e.currentSequenceNumber),b.resolve()}d_(e){let t=e.key.toString().length;return e.isFoundDocument()&&(t+=rc(e.data.value)),t}Os(e,t,n){return b.or([()=>this.persistence.g_(e,t),()=>this.persistence.getTargetCache().containsKey(e,t),()=>{const s=this.D_.get(t);return b.resolve(s!==void 0&&s>n)}])}getCacheSize(e){return this.persistence.getRemoteDocumentCache().getSize(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Lb{constructor(e){this.serializer=e}Nn(e,t,n,s){const i=new Cu("createOrUpgrade",t);n<1&&s>=1&&((function(c){c.createObjectStore(da)})(e),(function(c){c.createObjectStore(jo,{keyPath:MR}),c.createObjectStore($t,{keyPath:IC,autoIncrement:!0}).createIndex(Yr,DC,{unique:!0}),c.createObjectStore(ui)})(e),GC(e),(function(c){c.createObjectStore(qr)})(e));let o=b.resolve();return n<3&&s>=3&&(n!==0&&((function(c){c.deleteObjectStore(Bi),c.deleteObjectStore(li),c.deleteObjectStore(ns)})(e),GC(e)),o=o.next((()=>(function(c){const l=c.store(ns),B={highestTargetId:0,highestListenSequenceNumber:0,lastRemoteSnapshotVersion:X.min().toTimestamp(),targetCount:0};return l.put(xc,B)})(i)))),n<4&&s>=4&&(n!==0&&(o=o.next((()=>(function(c,l){return l.store($t).Qn().next((f=>{c.deleteObjectStore($t),c.createObjectStore($t,{keyPath:IC,autoIncrement:!0}).createIndex(Yr,DC,{unique:!0});const p=l.store($t),m=f.map((y=>p.put(y)));return b.waitFor(m)}))})(e,i)))),o=o.next((()=>{(function(c){c.createObjectStore(hi,{keyPath:$R})})(e)}))),n<5&&s>=5&&(o=o.next((()=>this.x_(i)))),n<6&&s>=6&&(o=o.next((()=>((function(c){c.createObjectStore(Ko)})(e),this.C_(i))))),n<7&&s>=7&&(o=o.next((()=>this.F_(i)))),n<8&&s>=8&&(o=o.next((()=>this.O_(e,i)))),n<9&&s>=9&&(o=o.next((()=>{(function(c){c.objectStoreNames.contains("remoteDocumentChanges")&&c.deleteObjectStore("remoteDocumentChanges")})(e)}))),n<10&&s>=10&&(o=o.next((()=>this.M_(i)))),n<11&&s>=11&&(o=o.next((()=>{(function(c){c.createObjectStore(Tu,{keyPath:QR})})(e),(function(c){c.createObjectStore(wu,{keyPath:WR})})(e)}))),n<12&&s>=12&&(o=o.next((()=>{(function(c){const l=c.createObjectStore(Au,{keyPath:rb});l.createIndex(_B,sb,{unique:!1}),l.createIndex(fE,ib,{unique:!1})})(e)}))),n<13&&s>=13&&(o=o.next((()=>(function(c){const l=c.createObjectStore(kc,{keyPath:UR});l.createIndex(Bc,HR),l.createIndex(uE,qR)})(e))).next((()=>this.N_(e,i))).next((()=>e.deleteObjectStore(qr)))),n<14&&s>=14&&(o=o.next((()=>this.L_(e,i)))),n<15&&s>=15&&(o=o.next((()=>(function(c){c.createObjectStore(xh,{keyPath:YR,autoIncrement:!0}).createIndex(mB,XR,{unique:!1}),c.createObjectStore(Eo,{keyPath:ZR}).createIndex(BE,eb,{unique:!1}),c.createObjectStore(Io,{keyPath:tb}).createIndex(hE,nb,{unique:!1})})(e)))),n<16&&s>=16&&(o=o.next((()=>{t.objectStore(Eo).clear()})).next((()=>{t.objectStore(Io).clear()}))),n<17&&s>=17&&(o=o.next((()=>{(function(c){c.createObjectStore(Vh,{keyPath:ob})})(e)}))),n<18&&s>=18&&fm()&&(o=o.next((()=>{t.objectStore(Eo).clear()})).next((()=>{t.objectStore(Io).clear()}))),o}C_(e){let t=0;return e.store(qr).Hn(((n,s)=>{t+=Vc(s)})).next((()=>{const n={byteSize:t};return e.store(Ko).put(gB,n)}))}x_(e){const t=e.store(jo),n=e.store($t);return t.Qn().next((s=>b.forEach(s,(i=>{const o=IDBKeyRange.bound([i.userId,Zr],[i.userId,i.lastAcknowledgedBatchId]);return n.Qn(Yr,o).next((a=>b.forEach(a,(c=>{H(c.userId===i.userId,18650,"Cannot process batch from unexpected user",{batchId:c.batchId});const l=Jr(this.serializer,c);return mE(e,i.userId,l).next((()=>{}))}))))}))))}F_(e){const t=e.store(Bi),n=e.store(qr);return e.store(ns).get(xc).next((s=>{const i=[];return n.Hn(((o,a)=>{const c=new le(o),l=(function(f){return[0,it(f)]})(c);i.push(t.get(l).next((B=>B?b.resolve():(f=>t.put({targetId:0,path:it(f),sequenceNumber:s.highestListenSequenceNumber}))(c))))})).next((()=>b.waitFor(i)))}))}O_(e,t){e.createObjectStore(Jo,{keyPath:zR});const n=t.store(Jo),s=new Hh,i=o=>{if(s.add(o)){const a=o.lastSegment(),c=o.popLast();return n.put({collectionId:a,parent:it(c)})}};return t.store(qr).Hn({jn:!0},((o,a)=>{const c=new le(o);return i(c.popLast())})).next((()=>t.store(ui).Hn({jn:!0},(([o,a,c],l)=>{const B=ln(a);return i(B.popLast())}))))}M_(e){const t=e.store(li);return t.Hn(((n,s)=>{const i=uo(this.serializer,s),o=EE(this.serializer,i);return t.put(o)}))}N_(e,t){const n=t.store(qr),s=[];return n.Hn(((i,o)=>{const a=t.store(kc),c=(function(f){return f.document?new K(le.fromString(f.document.name).popFirst(5)):f.noDocument?K.fromSegments(f.noDocument.path):f.unknownDocument?K.fromSegments(f.unknownDocument.path):z(36783)})(o).path.toArray(),l={prefixPath:c.slice(0,c.length-2),collectionGroup:c[c.length-2],documentId:c[c.length-1],readTime:o.readTime||[0,0],unknownDocument:o.unknownDocument,noDocument:o.noDocument,document:o.document,hasCommittedMutations:!!o.hasCommittedMutations};s.push(a.put(l))})).next((()=>b.waitFor(s)))}L_(e,t){const n=t.store($t),s=bE(this.serializer),i=new jh(Su.b_,this.serializer.$r);return n.Qn().next((o=>{const a=new Map;return o.forEach((c=>{let l=a.get(c.userId)??ae();Jr(this.serializer,c).keys().forEach((B=>l=l.add(B))),a.set(c.userId,l)})),b.forEach(a,((c,l)=>{const B=new tt(l),f=Ru.Qr(this.serializer,B),p=i.getIndexManager(B),m=vu.Qr(B,this.serializer,p,i.referenceDelegate);return new SE(s,m,f,p).recalculateAndSaveOverlaysForDocumentKeys(new EB(t,Et.wn),c).next()}))}))}}function GC(r){r.createObjectStore(Bi,{keyPath:KR}).createIndex(kh,JR,{unique:!0}),r.createObjectStore(li,{keyPath:"targetId"}).createIndex(lE,jR,{unique:!0}),r.createObjectStore(ns)}const Xn="IndexedDbPersistence",Rl=18e5,bl=5e3,Sl="Failed to obtain exclusive access to the persistence layer. To allow shared access, multi-tab synchronization has to be enabled in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.",PE="main";class Kh{constructor(e,t,n,s,i,o,a,c,l,B,f=18){if(this.allowTabSynchronization=e,this.persistenceKey=t,this.clientId=n,this.Ct=i,this.window=o,this.document=a,this.B_=l,this.U_=B,this.k_=f,this.I_=null,this.R_=!1,this.isPrimary=!1,this.networkEnabled=!0,this.q_=null,this.inForeground=!1,this.K_=null,this.Q_=null,this.W_=Number.NEGATIVE_INFINITY,this.G_=p=>Promise.resolve(),!Kh.Ye())throw new U(O.UNIMPLEMENTED,"This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");this.referenceDelegate=new Db(this,s),this.z_=t+PE,this.serializer=new _E(c),this.j_=new pn(this.z_,this.k_,new Lb(this.serializer)),this.A_=new fb,this.V_=new Ib(this.referenceDelegate,this.serializer),this.remoteDocumentCache=bE(this.serializer),this.f_=new hb,this.window&&this.window.localStorage?this.H_=this.window.localStorage:(this.H_=null,B===!1&&Fe(Xn,"LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page."))}start(){return this.J_().then((()=>{if(!this.isPrimary&&!this.allowTabSynchronization)throw new U(O.FAILED_PRECONDITION,Sl);return this.Y_(),this.Z_(),this.X_(),this.runTransaction("getHighestListenSequenceNumber","readonly",(e=>this.V_.getHighestSequenceNumber(e)))})).then((e=>{this.I_=new Et(e,this.B_)})).then((()=>{this.R_=!0})).catch((e=>(this.j_&&this.j_.close(),Promise.reject(e))))}eo(e){return this.G_=async t=>{if(this.started)return e(t)},e(this.isPrimary)}setDatabaseDeletedListener(e){this.j_.Bn((async t=>{t.newVersion===null&&await e()}))}setNetworkEnabled(e){this.networkEnabled!==e&&(this.networkEnabled=e,this.Ct.enqueueAndForget((async()=>{this.started&&await this.J_()})))}J_(){return this.runTransaction("updateClientMetadataAndTryBecomePrimary","readwrite",(e=>Wa(e).put({clientId:this.clientId,updateTimeMs:Date.now(),networkEnabled:this.networkEnabled,inForeground:this.inForeground}).next((()=>{if(this.isPrimary)return this.no(e).next((t=>{t||(this.isPrimary=!1,this.Ct.enqueueRetryable((()=>this.G_(!1))))}))})).next((()=>this.ro(e))).next((t=>this.isPrimary&&!t?this.io(e).next((()=>!1)):!!t&&this.so(e).next((()=>!0)))))).catch((e=>{if(Sr(e))return G(Xn,"Failed to extend owner lease: ",e),this.isPrimary;if(!this.allowTabSynchronization)throw e;return G(Xn,"Releasing owner lease after error during lease refresh",e),!1})).then((e=>{this.isPrimary!==e&&this.Ct.enqueueRetryable((()=>this.G_(e))),this.isPrimary=e}))}no(e){return to(e).get(Ps).next((t=>b.resolve(this._o(t))))}oo(e){return Wa(e).delete(this.clientId)}async ao(){if(this.isPrimary&&!this.uo(this.W_,Rl)){this.W_=Date.now();const e=await this.runTransaction("maybeGarbageCollectMultiClientState","readwrite-primary",(t=>{const n=qe(t,hi);return n.Qn().next((s=>{const i=this.co(s,Rl),o=s.filter((a=>i.indexOf(a)===-1));return b.forEach(o,(a=>n.delete(a.clientId))).next((()=>o))}))})).catch((()=>[]));if(this.H_)for(const t of e)this.H_.removeItem(this.lo(t.clientId))}}X_(){this.Q_=this.Ct.enqueueAfterDelay("client_metadata_refresh",4e3,(()=>this.J_().then((()=>this.ao())).then((()=>this.X_()))))}_o(e){return!!e&&e.ownerId===this.clientId}ro(e){return this.U_?b.resolve(!0):to(e).get(Ps).next((t=>{if(t!==null&&this.uo(t.leaseTimestampMs,bl)&&!this.Eo(t.ownerId)){if(this._o(t)&&this.networkEnabled)return!0;if(!this._o(t)){if(!t.allowTabSynchronization)throw new U(O.FAILED_PRECONDITION,Sl);return!1}}return!(!this.networkEnabled||!this.inForeground)||Wa(e).Qn().next((n=>this.co(n,bl).find((s=>{if(this.clientId!==s.clientId){const i=!this.networkEnabled&&s.networkEnabled,o=!this.inForeground&&s.inForeground,a=this.networkEnabled===s.networkEnabled;if(i||o&&a)return!0}return!1}))===void 0))})).next((t=>(this.isPrimary!==t&&G(Xn,`Client ${t?"is":"is not"} eligible for a primary lease.`),t)))}async shutdown(){this.R_=!1,this.ho(),this.Q_&&(this.Q_.cancel(),this.Q_=null),this.To(),this.Po(),await this.j_.runTransaction("shutdown","readwrite",[da,hi],(e=>{const t=new EB(e,Et.wn);return this.io(t).next((()=>this.oo(t)))})),this.j_.close(),this.Io()}co(e,t){return e.filter((n=>this.uo(n.updateTimeMs,t)&&!this.Eo(n.clientId)))}Ro(){return this.runTransaction("getActiveClients","readonly",(e=>Wa(e).Qn().next((t=>this.co(t,Rl).map((n=>n.clientId))))))}get started(){return this.R_}getGlobalsCache(){return this.A_}getMutationQueue(e,t){return vu.Qr(e,this.serializer,t,this.referenceDelegate)}getTargetCache(){return this.V_}getRemoteDocumentCache(){return this.remoteDocumentCache}getIndexManager(e){return new Eb(e,this.serializer.$r.databaseId)}getDocumentOverlayCache(e){return Ru.Qr(this.serializer,e)}getBundleCache(){return this.f_}runTransaction(e,t,n){G(Xn,"Starting transaction:",e);const s=t==="readonly"?"readonly":"readwrite",i=(function(c){return c===18?ub:c===17?gE:c===16?cb:c===15?Mh:c===14?CE:c===13?pE:c===12?ab:c===11?dE:void z(60245)})(this.k_);let o;return this.j_.runTransaction(e,s,i,(a=>(o=new EB(a,this.I_?this.I_.next():Et.wn),t==="readwrite-primary"?this.no(o).next((c=>!!c||this.ro(o))).next((c=>{if(!c)throw Fe(`Failed to obtain primary lease for action '${e}'.`),this.isPrimary=!1,this.Ct.enqueueRetryable((()=>this.G_(!1))),new U(O.FAILED_PRECONDITION,O_);return n(o)})).next((c=>this.so(o).next((()=>c)))):this.Ao(o).next((()=>n(o)))))).then((a=>(o.raiseOnCommittedEvent(),a)))}Ao(e){return to(e).get(Ps).next((t=>{if(t!==null&&this.uo(t.leaseTimestampMs,bl)&&!this.Eo(t.ownerId)&&!this._o(t)&&!(this.U_||this.allowTabSynchronization&&t.allowTabSynchronization))throw new U(O.FAILED_PRECONDITION,Sl)}))}so(e){const t={ownerId:this.clientId,allowTabSynchronization:this.allowTabSynchronization,leaseTimestampMs:Date.now()};return to(e).put(Ps,t)}static Ye(){return pn.Ye()}io(e){const t=to(e);return t.get(Ps).next((n=>this._o(n)?(G(Xn,"Releasing primary lease."),t.delete(Ps)):b.resolve()))}uo(e,t){const n=Date.now();return!(e<n-t)&&(!(e>n)||(Fe(`Detected an update time that is in the future: ${e} > ${n}`),!1))}Y_(){this.document!==null&&typeof this.document.addEventListener=="function"&&(this.K_=()=>{this.Ct.enqueueAndForget((()=>(this.inForeground=this.document.visibilityState==="visible",this.J_())))},this.document.addEventListener("visibilitychange",this.K_),this.inForeground=this.document.visibilityState==="visible")}To(){this.K_&&(this.document.removeEventListener("visibilitychange",this.K_),this.K_=null)}Z_(){typeof this.window?.addEventListener=="function"&&(this.q_=()=>{this.ho();const e=/(?:Version|Mobile)\/1[456]/;hm()&&(navigator.appVersion.match(e)||navigator.userAgent.match(e))&&this.Ct.enterRestrictedMode(!0),this.Ct.enqueueAndForget((()=>this.shutdown()))},this.window.addEventListener("pagehide",this.q_))}Po(){this.q_&&(this.window.removeEventListener("pagehide",this.q_),this.q_=null)}Eo(e){try{const t=this.H_?.getItem(this.lo(e))!==null;return G(Xn,`Client '${e}' ${t?"is":"is not"} zombied in LocalStorage`),t}catch(t){return Fe(Xn,"Failed to get zombied client id.",t),!1}}ho(){if(this.H_)try{this.H_.setItem(this.lo(this.clientId),String(Date.now()))}catch(e){Fe("Failed to set zombie client id.",e)}}Io(){if(this.H_)try{this.H_.removeItem(this.lo(this.clientId))}catch{}}lo(e){return`firestore_zombie_${this.persistenceKey}_${e}`}}function to(r){return qe(r,da)}function Wa(r){return qe(r,hi)}function Jh(r,e){let t=r.projectId;return r.isDefaultDatabase||(t+="."+r.database),"firestore/"+e+"/"+t+"/"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zh{constructor(e,t,n,s){this.targetId=e,this.fromCache=t,this.Vo=n,this.fo=s}static mo(e,t){let n=ae(),s=ae();for(const i of t.docChanges)switch(i.type){case 0:n=n.add(i.doc.key);break;case 1:s=s.add(i.doc.key)}return new zh(e,t.fromCache,n,s)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function kb(r,e){return K.comparator(r.key,e.key)}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xb{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(e){this._documentReadCount+=e}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class NE{constructor(){this.po=!1,this.yo=!1,this.wo=100,this.bo=(function(){return hm()?8:L_(He())>0?6:4})()}initialize(e,t){this.So=e,this.indexManager=t,this.po=!0}getDocumentsMatchingQuery(e,t,n,s){const i={result:null};return this.vo(e,t).next((o=>{i.result=o})).next((()=>{if(!i.result)return this.Do(e,t,s,n).next((o=>{i.result=o}))})).next((()=>{if(i.result)return;const o=new xb;return this.xo(e,t,o).next((a=>{if(i.result=a,this.yo)return this.Co(e,t,o,a.size)}))})).next((()=>i.result))}Co(e,t,n,s){return Pe(t)?b.resolve():n.documentReadCount<this.wo?(Ms()<=Be.DEBUG&&G("QueryEngine","SDK will not create cache indexes for query:",po(t),"since it only creates cache indexes for collection contains","more than or equal to",this.wo,"documents"),b.resolve()):(Ms()<=Be.DEBUG&&G("QueryEngine","Query:",po(t),"scans",n.documentReadCount,"local documents and returns",s,"documents as results."),n.documentReadCount>this.bo*s?(Ms()<=Be.DEBUG&&G("QueryEngine","The SDK decides to create cache indexes for query:",po(t),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(e,Ot(t))):b.resolve())}vo(e,t){if(Pe(t))return b.resolve(null);let n=t;if(tC(n))return b.resolve(null);let s=Ot(n);return this.indexManager.getIndexType(e,s).next((i=>i===0?null:(n.limit!==null&&i===1&&(n=Pc(n,null,"F"),s=Ot(n)),this.indexManager.getDocumentsMatchingTarget(e,s).next((o=>{const a=ae(...o);return this.So.getDocuments(e,a).next((c=>this.indexManager.getMinOffset(e,s).next((l=>{const B=this.Fo(n,c);return this.Oo(n,B,a,l.readTime)?this.vo(e,Pc(n,null,"F")):this.Mo(e,B,n,l)}))))})))))}Do(e,t,n,s){return(Pe(t)?(function(o){for(const a of o.stages){if(a instanceof Ir||a instanceof mC)return!1;if(a instanceof Ba){if(a.condition instanceof Q_&&a.condition._expr.name==="exists"&&a.condition._expr.params[0]instanceof ys&&a.condition._expr.params[0].fieldName===an)continue;return!1}}return!0})(t):tC(t))||s.isEqual(X.min())?b.resolve(null):this.So.getDocuments(e,n).next((i=>{const o=this.Fo(t,i);return this.Oo(t,o,n,s)?b.resolve(null):(Ms()<=Be.DEBUG&&G("QueryEngine","Re-using previous result from %s to execute query: %s",s.toString(),_C(t)),this.Mo(e,o,t,i_(s,ai)).next((a=>a)))}))}Fo(e,t){let n,s;return Pe(e)?(n=new me(kb),s=i=>bu(e,i)):(n=new me(uh(e)),s=i=>du(e,i)),t.forEach(((i,o)=>{s(o)&&(n=n.add(o))})),n}Oo(e,t,n,s){if(Pe(e))return(function(a){return a.stages.some((c=>c instanceof Ir||c instanceof mC))})(e);if(e.limit===null)return!1;if(n.size!==t.size)return!0;const i=e.limitType==="F"?t.last():t.first();return!!i&&(i.hasPendingWrites||i.version.compareTo(s)>0)}xo(e,t,n){return Ms()<=Be.DEBUG&&G("QueryEngine","Using full collection scan to execute query:",_C(t)),this.So.getDocumentsMatchingQuery(e,t,kt.min(),n)}Mo(e,t,n,s){return this.So.getDocumentsMatchingQuery(e,n,s).next((i=>(t.forEach((o=>{i=i.insert(o.key,o)})),i)))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const $h="LocalStore",Vb=3e8;class Mb{constructor(e,t,n,s){this.persistence=e,this.No=t,this.serializer=s,this.Lo=new Ie(ie),this.Bo=new Gn((i=>yu(i)),Oh),this.Uo=new Map,this.ko=e.getRemoteDocumentCache(),this.V_=e.getTargetCache(),this.f_=e.getBundleCache(),this.qo(n)}qo(e){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(e),this.indexManager=this.persistence.getIndexManager(e),this.mutationQueue=this.persistence.getMutationQueue(e,this.indexManager),this.localDocuments=new SE(this.ko,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.ko.setIndexManager(this.indexManager),this.No.initialize(this.localDocuments,this.indexManager)}collectGarbage(e){return this.persistence.runTransaction("Collect garbage","readwrite-primary",(t=>e.collect(t,this.Lo)))}}function OE(r,e,t,n){return new Mb(r,e,t,n)}async function FE(r,e){const t=Q(r);return await t.persistence.runTransaction("Handle user change","readonly",(n=>{let s;return t.mutationQueue.getAllMutationBatches(n).next((i=>(s=i,t.qo(e),t.mutationQueue.getAllMutationBatches(n)))).next((i=>{const o=[],a=[];let c=ae();for(const l of s){o.push(l.batchId);for(const B of l.mutations)c=c.add(B.key)}for(const l of i){a.push(l.batchId);for(const B of l.mutations)c=c.add(B.key)}return t.localDocuments.getDocuments(n,c).next((l=>({$o:l,removedBatchIds:o,addedBatchIds:a})))}))}))}function Gb(r,e){const t=Q(r);return t.persistence.runTransaction("Acknowledge batch","readwrite-primary",(n=>{const s=e.batch.keys(),i=t.ko.newChangeBuffer({trackRemovals:!0});return(function(a,c,l,B){const f=l.batch,p=f.keys();let m=b.resolve();return p.forEach((y=>{m=m.next((()=>B.getEntry(c,y))).next((F=>{const V=l.docVersions.get(y);H(V!==null,48541),F.version.compareTo(V)<0&&(f.applyToRemoteDocument(F,l),F.isValidDocument()&&(F.setReadTime(l.commitVersion),B.addEntry(F)))}))})),m.next((()=>a.mutationQueue.removeMutationBatch(c,f)))})(t,n,e,i).next((()=>i.apply(n))).next((()=>t.mutationQueue.performConsistencyCheck(n))).next((()=>t.documentOverlayCache.removeOverlaysForBatchId(n,s,e.batch.batchId))).next((()=>t.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(n,(function(a){let c=ae();for(let l=0;l<a.mutationResults.length;++l)a.mutationResults[l].transformResults.length>0&&(c=c.add(a.batch.mutations[l].key));return c})(e)))).next((()=>t.localDocuments.getDocuments(n,s)))}))}function LE(r){const e=Q(r);return e.persistence.runTransaction("Get last remote snapshot version","readonly",(t=>e.V_.getLastRemoteSnapshotVersion(t)))}function Ub(r,e){const t=Q(r),n=e.snapshotVersion;let s=t.Lo;return t.persistence.runTransaction("Apply remote event","readwrite-primary",(i=>{const o=t.ko.newChangeBuffer({trackRemovals:!0});s=t.Lo;const a=[];e.targetChanges.forEach(((B,f)=>{const p=s.get(f);if(!p)return;a.push(t.V_.removeMatchingKeys(i,B.removedDocuments,f).next((()=>t.V_.addMatchingKeys(i,B.addedDocuments,f))));let m=p.withSequenceNumber(i.currentSequenceNumber);e.targetMismatches.get(f)!==null?m=m.withResumeToken(be.EMPTY_BYTE_STRING,X.min()).withLastLimboFreeSnapshotVersion(X.min()):B.resumeToken.approximateByteSize()>0&&(m=m.withResumeToken(B.resumeToken,n)),s=s.insert(f,m),(function(F,V,j){return F.resumeToken.approximateByteSize()===0||V.snapshotVersion.toMicroseconds()-F.snapshotVersion.toMicroseconds()>=Vb?!0:j.addedDocuments.size+j.modifiedDocuments.size+j.removedDocuments.size>0})(p,m,B)&&a.push(t.V_.updateTargetData(i,m))}));let c=Me(),l=ae();if(e.documentUpdates.forEach((B=>{e.resolvedLimboDocuments.has(B)&&a.push(t.persistence.referenceDelegate.updateLimboDocument(i,B))})),a.push(Hb(i,o,e.documentUpdates).next((B=>{c=B.Ko,l=B.Qo}))),!n.isEqual(X.min())){const B=t.V_.getLastRemoteSnapshotVersion(i).next((f=>t.V_.setTargetsMetadata(i,i.currentSequenceNumber,n)));a.push(B)}return b.waitFor(a).next((()=>o.apply(i))).next((()=>t.localDocuments.getLocalViewOfDocuments(i,c,l))).next((()=>c))})).then((i=>(t.Lo=s,i)))}function Hb(r,e,t){let n=ae(),s=ae();return t.forEach((i=>n=n.add(i))),e.getEntries(r,n).next((i=>{let o=Me();return t.forEach(((a,c)=>{const l=i.get(a);c.isFoundDocument()!==l.isFoundDocument()&&(s=s.add(a)),c.isNoDocument()&&c.version.isEqual(X.min())?(e.removeEntry(a,c.readTime),o=o.insert(a,c)):!l.isValidDocument()||c.version.compareTo(l.version)>0||c.version.compareTo(l.version)===0&&l.hasPendingWrites?(e.addEntry(c),o=o.insert(a,c)):G($h,"Ignoring outdated watch update for ",a,". Current version:",l.version," Watch version:",c.version)})),{Ko:o,Qo:s}}))}function qb(r,e){const t=Q(r);return t.persistence.runTransaction("Get next mutation batch","readonly",(n=>(e===void 0&&(e=Zr),t.mutationQueue.getNextMutationBatchAfterBatchId(n,e))))}function Hc(r,e){const t=Q(r);return t.persistence.runTransaction("Allocate target","readwrite",(n=>{let s;return t.V_.getTargetData(n,e).next((i=>i?(s=i,b.resolve(s)):t.V_.allocateTargetId(n).next((o=>(s=new Bn(e,o,"TargetPurposeListen",n.currentSequenceNumber),t.V_.addTargetData(n,s).next((()=>s)))))))})).then((n=>{const s=t.Lo.get(n.targetId);return(s===null||n.snapshotVersion.compareTo(s.snapshotVersion)>0)&&(t.Lo=t.Lo.insert(n.targetId,n),t.Bo.set(e,n.targetId)),n}))}async function fi(r,e,t){const n=Q(r),s=n.Lo.get(e),i=t?"readwrite":"readwrite-primary";try{t||await n.persistence.runTransaction("Release target",i,(o=>n.persistence.referenceDelegate.removeTarget(o,s)))}catch(o){if(!Sr(o))throw o;G($h,`Failed to update sequence numbers for target ${e}: ${o}`)}n.Lo=n.Lo.remove(e),n.Bo.delete(s.target)}function AB(r,e,t){const n=Q(r);let s=X.min(),i=ae();return n.persistence.runTransaction("Execute query","readwrite",(o=>(function(c,l,B){const f=Q(c),p=f.Bo.get(B);return p!==void 0?b.resolve(f.Lo.get(p)):f.V_.getTargetData(l,B)})(n,o,Pe(e)?e:Ot(e)).next((a=>{if(a)return s=a.lastLimboFreeSnapshotVersion,n.V_.getMatchingKeysForTargetId(o,a.targetId).next((c=>{i=c}))})).next((()=>n.No.getDocumentsMatchingQuery(o,e,t?s:X.min(),t?i:ae()))).next((a=>(xE(n,a),{documents:a,Wo:i})))))}function kE(r,e){const t=Q(r),n=Q(t.V_),s=t.Lo.get(e);return s?Promise.resolve(s.target??null):t.persistence.runTransaction("Get target data","readonly",(i=>n.ye(i,e).next((o=>o?.target??null))))}function vB(r,e){const t=Q(r),n=t.Uo.get(e)||X.min();return t.persistence.runTransaction("Get new document changes","readonly",(s=>t.ko.getAllFromCollectionGroup(s,e,i_(n,ai),Number.MAX_SAFE_INTEGER))).then((s=>(xE(t,s),s)))}function xE(r,e){e.forEach(((t,n)=>{const s=n.key.getCollectionGroup(),i=r.Uo.get(s)||X.min();n.readTime.compareTo(i)>0&&r.Uo.set(s,n.readTime)}))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jb{constructor(e,t){this.asyncQueue=e,this.onlineStateHandler=t,this.state="Unknown",this.Yo=0,this.Zo=null,this.Xo=!0}ea(){this.Yo===0&&(this.ta("Unknown"),this.Zo=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,(()=>(this.Zo=null,this.na("Backend didn't respond within 10 seconds."),this.ta("Offline"),Promise.resolve()))))}ra(e){this.state==="Online"?this.ta("Unknown"):(this.Yo++,this.Yo>=1&&(this.ia(),this.na(`Connection failed 1 times. Most recent error: ${e.toString()}`),this.ta("Offline")))}set(e){this.ia(),this.Yo=0,e==="Online"&&(this.Xo=!1),this.ta(e)}ta(e){e!==this.state&&(this.state=e,this.onlineStateHandler(e))}na(e){const t=`Could not reach Cloud Firestore backend. ${e}
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;this.Xo?(Fe(t),this.Xo=!1):G("OnlineStateTracker",t)}ia(){this.Zo!==null&&(this.Zo.cancel(),this.Zo=null)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const En="RemoteStore";class Kb{constructor(e,t,n,s,i){this.localStore=e,this.datastore=t,this.asyncQueue=n,this.remoteSyncer={},this.sa=[],this._a=new Map,this.oa=new Map,this.aa=new Map,this.ua=new Ln(1e3),this.ca=new Ln(1001),this.la=new Set,this.Ea=[],this.ha=i,this.ha.Qe((o=>{n.enqueueAndForget((async()=>{ws(this)&&(G(En,"Restarting streams for network reachability change."),await(async function(c){const l=Q(c);l.la.add(4),await pa(l),l.Ta.set("Unknown"),l.la.delete(4),await Pu(l)})(this))}))})),this.Ta=new jb(n,s)}}async function Pu(r){if(ws(r))for(const e of r.Ea)await e(!0)}async function pa(r){for(const e of r.Ea)await e(!1)}function RB(r,e){return r.oa.get(e)||void 0}function Nu(r,e){const t=Q(r),n=RB(t,e.targetId);if(n!==void 0&&t._a.has(n))return;const s=(function(a,c){const l=RB(a,c);l!==void 0&&a.aa.delete(l);const B=(function(p,m){return m%2!=0?p.ca.next():p.ua.next()})(a,c);return a.oa.set(c,B),a.aa.set(B,c),B})(t,e.targetId);G(En,"remoteStoreListen mapping SDK target ID to remote",e.targetId,s);const i=new Bn(e.target,s,e.purpose,e.sequenceNumber,e.snapshotVersion,e.lastLimboFreeSnapshotVersion,e.resumeToken);t._a.set(s,i),Yh(t)?Wh(t):bi(t).Yt()&&Qh(t,i)}function di(r,e){const t=Q(r),n=bi(t),s=RB(t,e);G(En,"remoteStoreUnlisten removing mapping of SDK target ID to remote",e,s),t._a.delete(s),t.oa.delete(e),t.aa.delete(s),n.Yt()&&VE(t,s),t._a.size===0&&(n.Yt()?n.en():ws(t)&&t.Ta.set("Unknown"))}function Qh(r,e){if(r.Pa.J(e.targetId),e.resumeToken.approximateByteSize()>0||e.snapshotVersion.compareTo(X.min())>0){const t=r.aa.get(e.targetId);if(t===void 0)return void G(En,"SDK target ID not found for remote ID: "+e.targetId);const n=r.remoteSyncer.getRemoteKeysForTarget(t).size;e=e.withExpectedCount(n)}bi(r).Pn(e)}function VE(r,e){r.Pa.J(e),bi(r).In(e)}function Wh(r){r.Pa=new DA({getRemoteKeysForTarget:e=>{const t=r.aa.get(e);return t!==void 0?r.remoteSyncer.getRemoteKeysForTarget(t):ae()},ye:e=>r._a.get(e)||null,Ve:()=>r.datastore.serializer.databaseId}),bi(r).start(),r.Ta.ea()}function Yh(r){return ws(r)&&!bi(r).Jt()&&r._a.size>0}function ws(r){return Q(r).la.size===0}function ME(r){r.Pa=void 0}async function Jb(r){r.Ta.set("Online")}async function zb(r){r._a.forEach(((e,t)=>{Qh(r,e)}))}async function $b(r,e){ME(r),Yh(r)?(r.Ta.ra(e),Wh(r)):r.Ta.set("Unknown")}async function Qb(r,e,t){if(r.Ta.set("Online"),e instanceof p_&&e.state===2&&e.cause)try{await(async function(s,i){const o=i.cause;for(const a of i.targetIds){if(s._a.has(a)){const c=s.aa.get(a);c!==void 0&&(await s.remoteSyncer.rejectListen(c,o),s.oa.delete(c),s.aa.delete(a)),s._a.delete(a)}s.Pa.removeTarget(a)}})(r,e)}catch(n){G(En,"Failed to remove targets %s: %s ",e.targetIds.join(","),n),await qc(r,n)}else if(e instanceof oc?r.Pa._e(e):e instanceof d_?r.Pa.he(e):r.Pa.ue(e),!t.isEqual(X.min()))try{const n=await LE(r.localStore);t.compareTo(n)>=0&&await(function(i,o){const a=i.Pa.fe(o);a.targetChanges.forEach(((l,B)=>{if(l.resumeToken.approximateByteSize()>0){const f=i._a.get(B);f&&i._a.set(B,f.withResumeToken(l.resumeToken,o))}})),a.targetMismatches.forEach(((l,B)=>{const f=i._a.get(l);if(!f)return;i._a.set(l,f.withResumeToken(be.EMPTY_BYTE_STRING,f.snapshotVersion)),VE(i,l);const p=new Bn(f.target,l,B,f.sequenceNumber);Qh(i,p)}));const c=(function(B,f){const p=new Map;f.targetChanges.forEach(((y,F)=>{const V=B.aa.get(F);V!==void 0&&p.set(V,y)}));let m=new Ie(ie);return f.targetMismatches.forEach(((y,F)=>{const V=B.aa.get(y);V!==void 0&&(m=m.insert(V,F))})),new yi(f.snapshotVersion,p,m,f.documentUpdates,f.augmentedDocumentUpdates,f.resolvedLimboDocuments)})(i,a);return i.remoteSyncer.applyRemoteEvent(c)})(r,t)}catch(n){G(En,"Failed to raise snapshot:",n),await qc(r,n)}}async function qc(r,e,t){if(!Sr(e))throw e;r.la.add(1),await pa(r),r.Ta.set("Offline"),t||(t=()=>LE(r.localStore)),r.asyncQueue.enqueueRetryable((async()=>{G(En,"Retrying IndexedDB access"),await t(),r.la.delete(1),await Pu(r)}))}function GE(r,e){return e().catch((t=>qc(r,t,e)))}async function Ri(r){const e=Q(r),t=yr(e);let n=e.sa.length>0?e.sa[e.sa.length-1].batchId:Zr;for(;Wb(e);)try{const s=await qb(e.localStore,n);if(s===null){e.sa.length===0&&t.en();break}n=s.batchId,Yb(e,s)}catch(s){await qc(e,s)}UE(e)&&HE(e)}function Wb(r){return ws(r)&&r.sa.length<10}function Yb(r,e){r.sa.push(e);const t=yr(r);t.Yt()&&t.Rn&&t.An(e.mutations)}function UE(r){return ws(r)&&!yr(r).Jt()&&r.sa.length>0}function HE(r){yr(r).start()}async function Xb(r){yr(r).fn()}async function Zb(r){const e=yr(r);for(const t of r.sa)e.An(t.mutations)}async function eS(r,e,t){const n=r.sa.shift(),s=Lh.from(n,e,t);await GE(r,(()=>r.remoteSyncer.applySuccessfulWrite(s))),await Ri(r)}async function tS(r,e){e&&yr(r).Rn&&await(async function(n,s){if((function(o){return u_(o)&&o!==O.ABORTED})(s.code)){const i=n.sa.shift();yr(n).Xt(),await GE(n,(()=>n.remoteSyncer.rejectFailedWrite(i.batchId,s))),await Ri(n)}})(r,e),UE(r)&&HE(r)}async function UC(r,e){const t=Q(r);t.asyncQueue.verifyOperationInProgress(),G(En,"RemoteStore received new credentials");const n=ws(t);t.la.add(3),await pa(t),n&&t.Ta.set("Unknown"),await t.remoteSyncer.handleCredentialChange(e),t.la.delete(3),await Pu(t)}async function bB(r,e){const t=Q(r);e?(t.la.delete(2),await Pu(t)):e||(t.la.add(2),await pa(t),t.Ta.set("Unknown"))}function bi(r){return r.Ia||(r.Ia=(function(t,n,s){const i=Q(t);return i.pn(),new $A(n,i.connection,i.authCredentials,i.appCheckCredentials,i.serializer,s)})(r.datastore,r.asyncQueue,{ct:Jb.bind(null,r),Et:zb.bind(null,r),Tt:$b.bind(null,r),Tn:Qb.bind(null,r)}),r.Ea.push((async e=>{e?(r.Ia.Xt(),Yh(r)?Wh(r):r.Ta.set("Unknown")):(await r.Ia.stop(),ME(r))}))),r.Ia}function yr(r){return r.Ra||(r.Ra=(function(t,n,s){const i=Q(t);return i.pn(),new QA(n,i.connection,i.authCredentials,i.appCheckCredentials,i.serializer,s)})(r.datastore,r.asyncQueue,{ct:()=>Promise.resolve(),Et:Xb.bind(null,r),Tt:tS.bind(null,r),Vn:Zb.bind(null,r),dn:eS.bind(null,r)}),r.Ea.push((async e=>{e?(r.Ra.Xt(),await Ri(r)):(await r.Ra.stop(),r.sa.length>0&&(G(En,`Stopping write stream with ${r.sa.length} pending writes`),r.sa=[]))}))),r.Ra}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xh{constructor(e){this.observer=e,this.muted=!1}next(e){this.muted||this.observer.next&&this.Aa(this.observer.next,e)}error(e){this.muted||(this.observer.error?this.Aa(this.observer.error,e):Fe("Uncaught Error in snapshot listener:",e.toString()))}Va(){this.muted=!0}Aa(e,t){setTimeout((()=>{this.muted||e(t)}),0)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zh{constructor(e,t,n,s,i){this.asyncQueue=e,this.timerId=t,this.targetTimeMs=n,this.op=s,this.removalCallback=i,this.deferred=new qt,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch((o=>{}))}get promise(){return this.deferred.promise}static createAndSchedule(e,t,n,s,i){const o=Date.now()+n,a=new Zh(e,t,o,s,i);return a.start(n),a}start(e){this.timerHandle=setTimeout((()=>this.handleDelayElapsed()),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new U(O.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget((()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then((e=>this.deferred.resolve(e)))):Promise.resolve()))}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function ef(r,e){if(Fe("AsyncQueue",`${e}: ${r}`),Sr(r))return new U(O.UNAVAILABLE,`${e}: ${r}`);throw r}const Do="IndexBackfiller";class nS{constructor(e,t){this.asyncQueue=e,this.Da=t,this.task=null}start(){this.xa(15e3)}stop(){this.task&&(this.task.cancel(),this.task=null)}get started(){return this.task!==null}xa(e){G(Do,`Scheduled in ${e}ms`),this.task=this.asyncQueue.enqueueAfterDelay("index_backfill",e,(async()=>{this.task=null;try{const t=await this.Da.Ca();G(Do,`Documents written: ${t}`)}catch(t){Sr(t)?G(Do,"Ignoring IndexedDB error during index backfill: ",t):await br(t)}await this.xa(6e4)}))}}class rS{constructor(e,t){this.localStore=e,this.persistence=t}async Ca(e=50){return this.persistence.runTransaction("Backfill Indexes","readwrite-primary",(t=>this.Fa(t,e)))}Fa(e,t){const n=new Set;let s=t,i=!0;return b.doWhile((()=>i===!0&&s>0),(()=>this.localStore.indexManager.getNextCollectionGroupToUpdate(e).next((o=>{if(o!==null&&!n.has(o))return G(Do,`Processing collection: ${o}`),this.Oa(e,o,s).next((a=>{s-=a,n.add(o)}));i=!1})))).next((()=>t-s))}Oa(e,t,n){return this.localStore.indexManager.getMinOffsetFromCollectionGroup(e,t).next((s=>this.localStore.localDocuments.getNextDocuments(e,t,s,n).next((i=>{const o=i.changes;return this.localStore.indexManager.updateIndexEntries(e,o).next((()=>this.Ma(s,i))).next((a=>(G(Do,`Updating offset: ${a}`),this.localStore.indexManager.updateCollectionGroup(e,t,a)))).next((()=>o.size))}))))}Ma(e,t){let n=e;return t.changes.forEach(((s,i)=>{const o=o_(i);oh(o,n)>0&&(n=o)})),new kt(n.readTime,n.documentKey,Math.max(t.batchId,e.largestBatchId))}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const qE="firestore_clients";function HC(r,e){return`${qE}_${r}_${e}`}const jE="firestore_mutations";function qC(r,e,t){let n=`${jE}_${r}_${t}`;return e.isAuthenticated()&&(n+=`_${e.uid}`),n}const KE="firestore_targets";function Pl(r,e){return`${KE}_${r}_${e}`}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const on="SharedClientState";class jc{constructor(e,t,n,s){this.user=e,this.batchId=t,this.state=n,this.error=s}static Na(e,t,n){const s=JSON.parse(n);let i,o=typeof s=="object"&&["pending","acknowledged","rejected"].indexOf(s.state)!==-1&&(s.error===void 0||typeof s.error=="object");return o&&s.error&&(o=typeof s.error.message=="string"&&typeof s.error.code=="string",o&&(i=new U(s.error.code,s.error.message))),o?new jc(e,t,s.state,i):(Fe(on,`Failed to parse mutation state for ID '${t}': ${n}`),null)}La(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class yo{constructor(e,t,n){this.targetId=e,this.state=t,this.error=n}static Na(e,t){const n=JSON.parse(t);let s,i=typeof n=="object"&&["not-current","current","rejected"].indexOf(n.state)!==-1&&(n.error===void 0||typeof n.error=="object");return i&&n.error&&(i=typeof n.error.message=="string"&&typeof n.error.code=="string",i&&(s=new U(n.error.code,n.error.message))),i?new yo(e,n.state,s):(Fe(on,`Failed to parse target state for ID '${e}': ${t}`),null)}La(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class Kc{constructor(e,t){this.clientId=e,this.activeTargetIds=t}static Na(e,t){const n=JSON.parse(t);let s=typeof n=="object"&&n.activeTargetIds instanceof Array,i=lh();for(let o=0;s&&o<n.activeTargetIds.length;++o)s=Um(n.activeTargetIds[o]),i=i.add(n.activeTargetIds[o]);return s?new Kc(e,i):(Fe(on,`Failed to parse client data for instance '${e}': ${t}`),null)}}class tf{constructor(e,t){this.clientId=e,this.onlineState=t}static Na(e){const t=JSON.parse(e);return typeof t=="object"&&["Unknown","Online","Offline"].indexOf(t.onlineState)!==-1&&typeof t.clientId=="string"?new tf(t.clientId,t.onlineState):(Fe(on,`Failed to parse online state: ${e}`),null)}}class SB{constructor(){this.activeTargetIds=lh()}Ba(e){this.activeTargetIds=this.activeTargetIds.add(e)}Ua(e){this.activeTargetIds=this.activeTargetIds.delete(e)}La(){const e={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(e)}}class Nl{constructor(e,t,n,s,i){this.window=e,this.Ct=t,this.persistenceKey=n,this.ka=s,this.syncEngine=null,this.onlineStateHandler=null,this.sequenceNumberHandler=null,this.qa=this.$a.bind(this),this.Ka=new Ie(ie),this.started=!1,this.Qa=[];const o=n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");this.storage=this.window.localStorage,this.currentUser=i,this.Wa=HC(this.persistenceKey,this.ka),this.Ga=(function(c){return`firestore_sequence_number_${c}`})(this.persistenceKey),this.Ka=this.Ka.insert(this.ka,new SB),this.za=new RegExp(`^${qE}_${o}_([^_]*)$`),this.ja=new RegExp(`^${jE}_${o}_(\\d+)(?:_(.*))?$`),this.Ha=new RegExp(`^${KE}_${o}_(\\d+)$`),this.Ja=(function(c){return`firestore_online_state_${c}`})(this.persistenceKey),this.Ya=(function(c){return`firestore_bundle_loaded_v2_${c}`})(this.persistenceKey),this.window.addEventListener("storage",this.qa)}static Ye(e){return!(!e||!e.localStorage)}async start(){const e=await this.syncEngine.Ro();for(const n of e){if(n===this.ka)continue;const s=this.getItem(HC(this.persistenceKey,n));if(s){const i=Kc.Na(n,s);i&&(this.Ka=this.Ka.insert(i.clientId,i))}}this.Za();const t=this.storage.getItem(this.Ja);if(t){const n=this.Xa(t);n&&this.eu(n)}for(const n of this.Qa)this.$a(n);this.Qa=[],this.window.addEventListener("pagehide",(()=>this.shutdown())),this.started=!0}writeSequenceNumber(e){this.setItem(this.Ga,JSON.stringify(e))}getAllActiveQueryTargets(){return this.tu(this.Ka)}isActiveQueryTarget(e){let t=!1;return this.Ka.forEach(((n,s)=>{s.activeTargetIds.has(e)&&(t=!0)})),t}addPendingMutation(e){this.nu(e,"pending")}updateMutationState(e,t,n){this.nu(e,t,n),this.ru(e)}addLocalQueryTarget(e,t=!0){let n="not-current";if(this.isActiveQueryTarget(e)){const s=this.storage.getItem(Pl(this.persistenceKey,e));if(s){const i=yo.Na(e,s);i&&(n=i.state)}}return t&&this.iu.Ba(e),this.Za(),n}removeLocalQueryTarget(e){this.iu.Ua(e),this.Za()}isLocalQueryTarget(e){return this.iu.activeTargetIds.has(e)}clearQueryState(e){this.removeItem(Pl(this.persistenceKey,e))}updateQueryState(e,t,n){this.su(e,t,n)}handleUserChange(e,t,n){t.forEach((s=>{this.ru(s)})),this.currentUser=e,n.forEach((s=>{this.addPendingMutation(s)}))}setOnlineState(e){this._u(e)}notifyBundleLoaded(e){this.ou(e)}shutdown(){this.started&&(this.window.removeEventListener("storage",this.qa),this.removeItem(this.Wa),this.started=!1)}getItem(e){const t=this.storage.getItem(e);return G(on,"READ",e,t),t}setItem(e,t){G(on,"SET",e,t),this.storage.setItem(e,t)}removeItem(e){G(on,"REMOVE",e),this.storage.removeItem(e)}$a(e){const t=e;if(t.storageArea===this.storage){if(G(on,"EVENT",t.key,t.newValue),t.key===this.Wa)return void Fe("Received WebStorage notification for local change. Another client might have garbage-collected our state");this.Ct.enqueueRetryable((async()=>{if(this.started){if(t.key!==null){if(this.za.test(t.key)){if(t.newValue==null){const n=this.au(t.key);return this.uu(n,null)}{const n=this.cu(t.key,t.newValue);if(n)return this.uu(n.clientId,n)}}else if(this.ja.test(t.key)){if(t.newValue!==null){const n=this.lu(t.key,t.newValue);if(n)return this.Eu(n)}}else if(this.Ha.test(t.key)){if(t.newValue!==null){const n=this.hu(t.key,t.newValue);if(n)return this.Tu(n)}}else if(t.key===this.Ja){if(t.newValue!==null){const n=this.Xa(t.newValue);if(n)return this.eu(n)}}else if(t.key===this.Ga){const n=(function(i){let o=Et.wn;if(i!=null)try{const a=JSON.parse(i);H(typeof a=="number",30636,{Pu:i}),o=a}catch(a){Fe(on,"Failed to read sequence number from WebStorage",a)}return o})(t.newValue);n!==Et.wn&&this.sequenceNumberHandler(n)}else if(t.key===this.Ya){const n=this.Iu(t.newValue);await Promise.all(n.map((s=>this.syncEngine.Ru(s))))}}}else this.Qa.push(t)}))}}get iu(){return this.Ka.get(this.ka)}Za(){this.setItem(this.Wa,this.iu.La())}nu(e,t,n){const s=new jc(this.currentUser,e,t,n),i=qC(this.persistenceKey,this.currentUser,e);this.setItem(i,s.La())}ru(e){const t=qC(this.persistenceKey,this.currentUser,e);this.removeItem(t)}_u(e){const t={clientId:this.ka,onlineState:e};this.storage.setItem(this.Ja,JSON.stringify(t))}su(e,t,n){const s=Pl(this.persistenceKey,e),i=new yo(e,t,n);this.setItem(s,i.La())}ou(e){const t=JSON.stringify(Array.from(e));this.setItem(this.Ya,t)}au(e){const t=this.za.exec(e);return t?t[1]:null}cu(e,t){const n=this.au(e);return Kc.Na(n,t)}lu(e,t){const n=this.ja.exec(e),s=Number(n[1]),i=n[2]!==void 0?n[2]:null;return jc.Na(new tt(i),s,t)}hu(e,t){const n=this.Ha.exec(e),s=Number(n[1]);return yo.Na(s,t)}Xa(e){return tf.Na(e)}Iu(e){return JSON.parse(e)}async Eu(e){if(e.user.uid===this.currentUser.uid)return this.syncEngine.Au(e.batchId,e.state,e.error);G(on,`Ignoring mutation for non-active user ${e.user.uid}`)}Tu(e){return this.syncEngine.Vu(e.targetId,e.state,e.error)}uu(e,t){const n=t?this.Ka.insert(e,t):this.Ka.remove(e),s=this.tu(this.Ka),i=this.tu(n),o=[],a=[];return i.forEach((c=>{s.has(c)||o.push(c)})),s.forEach((c=>{i.has(c)||a.push(c)})),this.syncEngine.du(o,a).then((()=>{this.Ka=n}))}eu(e){this.Ka.get(e.clientId)&&this.onlineStateHandler(e.onlineState)}tu(e){let t=lh();return e.forEach(((n,s)=>{t=t.unionWith(s.activeTargetIds)})),t}}class JE{constructor(){this.fu=new SB,this.mu={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(e){}updateMutationState(e,t,n){}addLocalQueryTarget(e,t=!0){return t&&this.fu.Ba(e),this.mu[e]||"not-current"}updateQueryState(e,t,n){this.mu[e]=t}removeLocalQueryTarget(e){this.fu.Ua(e)}isLocalQueryTarget(e){return this.fu.activeTargetIds.has(e)}clearQueryState(e){delete this.mu[e]}getAllActiveQueryTargets(){return this.fu.activeTargetIds}isActiveQueryTarget(e){return this.fu.activeTargetIds.has(e)}start(){return this.fu=new SB,Promise.resolve()}handleUserChange(e,t,n){}setOnlineState(e){}shutdown(){}writeSequenceNumber(e){}notifyBundleLoaded(e){}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function zE(){return typeof window<"u"?window:null}function fc(){return typeof document<"u"?document:null}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rs{static emptySet(e){return new rs(e.comparator)}constructor(e){this.comparator=e?(t,n)=>e(t,n)||K.comparator(t.key,n.key):(t,n)=>K.comparator(t.key,n.key),this.keyedMap=jr(),this.sortedSet=new Ie(this.comparator)}has(e){return this.keyedMap.get(e)!=null}get(e){return this.keyedMap.get(e)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(e){const t=this.keyedMap.get(e);return t?this.sortedSet.indexOf(t):-1}get size(){return this.sortedSet.size}forEach(e){this.sortedSet.inorderTraversal(((t,n)=>(e(t),!1)))}add(e){const t=this.delete(e.key);return t.copy(t.keyedMap.insert(e.key,e),t.sortedSet.insert(e,null))}delete(e){const t=this.get(e);return t?this.copy(this.keyedMap.remove(e),this.sortedSet.remove(t)):this}isEqual(e){if(!(e instanceof rs)||this.size!==e.size)return!1;const t=this.sortedSet.getIterator(),n=e.sortedSet.getIterator();for(;t.hasNext();){const s=t.getNext().key,i=n.getNext().key;if(!s.isEqual(i))return!1}return!0}toString(){const e=[];return this.forEach((t=>{e.push(t.toString())})),e.length===0?"DocumentSet ()":`DocumentSet (
  `+e.join(`  
`)+`
)`}copy(e,t){const n=new rs;return n.comparator=this.comparator,n.keyedMap=e,n.sortedSet=t,n}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jC{constructor(){this.pu=new Ie(K.comparator)}track(e){const t=e.doc.key,n=this.pu.get(t);n?e.type!==0&&n.type===3?this.pu=this.pu.insert(t,e):e.type===3&&n.type!==1?this.pu=this.pu.insert(t,{type:n.type,doc:e.doc}):e.type===2&&n.type===2?this.pu=this.pu.insert(t,{type:2,doc:e.doc}):e.type===2&&n.type===0?this.pu=this.pu.insert(t,{type:0,doc:e.doc}):e.type===1&&n.type===0?this.pu=this.pu.remove(t):e.type===1&&n.type===2?this.pu=this.pu.insert(t,{type:1,doc:n.doc}):e.type===0&&n.type===1?this.pu=this.pu.insert(t,{type:2,doc:e.doc}):z(63341,{we:e,gu:n}):this.pu=this.pu.insert(t,e)}yu(){const e=[];return this.pu.inorderTraversal(((t,n)=>{e.push(n)})),e}}class pi{constructor(e,t,n,s,i,o,a,c,l){this.query=e,this.docs=t,this.oldDocs=n,this.docChanges=s,this.mutatedKeys=i,this.fromCache=o,this.syncStateChanged=a,this.excludesMetadataChanges=c,this.hasCachedResults=l}static fromInitialDocuments(e,t,n,s,i){const o=[];return t.forEach((a=>{o.push({type:0,doc:a})})),new pi(e,t,rs.emptySet(t),o,n,s,!0,!1,i)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(e){if(!(this.fromCache===e.fromCache&&this.hasCachedResults===e.hasCachedResults&&this.syncStateChanged===e.syncStateChanged&&this.mutatedKeys.isEqual(e.mutatedKeys)&&Du(this.query,e.query)&&this.docs.isEqual(e.docs)&&this.oldDocs.isEqual(e.oldDocs)))return!1;const t=this.docChanges,n=e.docChanges;if(t.length!==n.length)return!1;for(let s=0;s<t.length;s++)if(t[s].type!==n[s].type||!t[s].doc.isEqual(n[s].doc))return!1;return!0}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sS{constructor(){this.wu=void 0,this.bu=[]}Su(){return this.bu.some((e=>e.vu()))}}class iS{constructor(){this.queries=KC(),this.onlineState="Unknown",this.Du=new Set}terminate(){(function(t,n){const s=Q(t),i=s.queries;s.queries=KC(),i.forEach(((o,a)=>{for(const c of a.bu)c.onError(n)}))})(this,new U(O.ABORTED,"Firestore shutting down"))}}function KC(){return new Gn((r=>aE(r)),Du)}async function nf(r,e){const t=Q(r);let n=3;const s=e.query;let i=t.queries.get(s);i?!i.Su()&&e.vu()&&(n=2):(i=new sS,n=e.vu()?0:1);try{switch(n){case 0:i.wu=await t.onListen(s,!0);break;case 1:i.wu=await t.onListen(s,!1);break;case 2:await t.onFirstRemoteStoreListen(s)}}catch(o){const a=ef(o,`Initialization of query '${Pe(e.query)?Rn(e.query):po(e.query)}' failed`);return void e.onError(a)}t.queries.set(s,i),i.bu.push(e),e.xu(t.onlineState),i.wu&&e.Cu(i.wu)&&sf(t)}async function rf(r,e){const t=Q(r),n=e.query;let s=3;const i=t.queries.get(n);if(i){const o=i.bu.indexOf(e);o>=0&&(i.bu.splice(o,1),i.bu.length===0?s=e.vu()?0:1:!i.Su()&&e.vu()&&(s=2))}switch(s){case 0:return t.queries.delete(n),t.onUnlisten(n,!0);case 1:return t.queries.delete(n),t.onUnlisten(n,!1);case 2:return t.onLastRemoteStoreUnlisten(n);default:return}}function oS(r,e){const t=Q(r);let n=!1;for(const s of e){const i=s.query,o=t.queries.get(i);if(o){for(const a of o.bu)a.Cu(s)&&(n=!0);o.wu=s}}n&&sf(t)}function aS(r,e,t){const n=Q(r),s=n.queries.get(e);if(s)for(const i of s.bu)i.onError(t);n.queries.delete(e)}function sf(r){r.Du.forEach((e=>{e.next()}))}var PB;(function(r){r.Default="default",r.Cache="cache"})(PB||(PB={}));class of{constructor(e,t,n){this.query=e,this.Fu=t,this.Ou=!1,this.Mu=null,this.onlineState="Unknown",this.options=n||{}}Cu(e){if(!this.options.includeMetadataChanges){const n=[];for(const s of e.docChanges)s.type!==3&&n.push(s);e=new pi(e.query,e.docs,e.oldDocs,n,e.mutatedKeys,e.fromCache,e.syncStateChanged,!0,e.hasCachedResults)}let t=!1;return this.Ou?this.Nu(e)&&(this.Fu.next(e),t=!0):this.Lu(e,this.onlineState)&&(this.Bu(e),t=!0),this.Mu=e,t}onError(e){this.Fu.error(e)}xu(e){this.onlineState=e;let t=!1;return this.Mu&&!this.Ou&&this.Lu(this.Mu,e)&&(this.Bu(this.Mu),t=!0),t}Lu(e,t){if(!e.fromCache||!this.vu())return!0;const n=t!=="Offline";return(!this.options.waitForSyncWhenOnline||!n)&&(!e.docs.isEmpty()||e.hasCachedResults||t==="Offline")}Nu(e){if(e.docChanges.length>0)return!0;const t=this.Mu&&this.Mu.hasPendingWrites!==e.hasPendingWrites;return!(!e.syncStateChanged&&!t)&&this.options.includeMetadataChanges===!0}Bu(e){e=pi.fromInitialDocuments(e.query,e.docs,e.mutatedKeys,e.fromCache,e.hasCachedResults),this.Ou=!0,this.Fu.next(e)}vu(){return this.options.source!==PB.Cache}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $E{constructor(e){this.key=e}}class QE{constructor(e){this.key=e}}class cS{constructor(e,t){this.query=e,this.zu=t,this.ju=null,this.hasCachedResults=!1,this.current=!1,this.Hu=ae(),this.mutatedKeys=ae(),this.Ju=Pe(e)?wB(e):uh(e),this.Yu=new rs(this.Ju)}get Zu(){return this.zu}Xu(e,t){const n=t?t.ec:new jC,s=t?t.Yu:this.Yu;let i=t?t.mutatedKeys:this.mutatedKeys,o=s,a=!1;const[c,l]=this.tc(this.query,s);e.inorderTraversal(((f,p)=>{const m=s.get(f),y=vE(this.query,p)?p:null,F=!!m&&this.mutatedKeys.has(m.key),V=!!y&&(y.hasLocalMutations||this.mutatedKeys.has(y.key)&&y.hasCommittedMutations);let j=!1;m&&y?m.data.isEqual(y.data)?F!==V&&(n.track({type:3,doc:y}),j=!0):this.nc(m,y)||(n.track({type:2,doc:y}),j=!0,(c&&this.Ju(y,c)>0||l&&this.Ju(y,l)<0)&&(a=!0)):!m&&y?(n.track({type:0,doc:y}),j=!0):m&&!y&&(n.track({type:1,doc:m}),j=!0,(c||l)&&(a=!0)),j&&(y?(o=o.add(y),i=V?i.add(f):i.delete(f)):(o=o.delete(f),i=i.delete(f)))}));const B=this.rc(this.query);if(B)if(Pe(this.query)){const f=[];o.forEach((y=>f.push(y)));const p=AE(this.query,f);let m=new rs(wB(this.query));for(const y of p)m=m.add(y);o.forEach((y=>{m.has(y.key)||(i=i.delete(y.key),n.track({type:1,doc:y}))})),o=m}else{const f=this.sc(this.query);for(;o.size>B;){const p=f==="F"?o.last():o.first();o=o.delete(p.key),i=i.delete(p.key),n.track({type:1,doc:p})}}return{Yu:o,ec:n,Oo:a,mutatedKeys:i}}rc(e){return Pe(e)?vl(e)?.limit:e.limit||void 0}sc(e){if(Pe(e)){const t=vl(e);return t&&t.limit<0?"L":"F"}return e.limitType}tc(e,t){if(Pe(e)){const n=vl(e)?.limit;return[t.size===n?t.last():null,null]}return[e.limitType==="F"&&t.size===this.rc(this.query)?t.last():null,e.limitType==="L"&&t.size===this.rc(this.query)?t.first():null]}nc(e,t){return e.hasLocalMutations&&t.hasCommittedMutations&&!t.hasLocalMutations}applyChanges(e,t,n,s){const i=this.Yu;this.Yu=e.Yu,this.mutatedKeys=e.mutatedKeys;const o=e.ec.yu();o.sort(((B,f)=>(function(m,y){const F=V=>{switch(V){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return z(20277,{we:V})}};return F(m)-F(y)})(B.type,f.type)||this.Ju(B.doc,f.doc))),this._c(n),s=s??!1;const a=t&&!s?this.oc():[],c=this.Hu.size===0&&this.current&&!s?1:0,l=c!==this.ju;return this.ju=c,o.length!==0||l?{snapshot:new pi(this.query,e.Yu,i,o,e.mutatedKeys,c===0,l,!1,!!n&&n.resumeToken.approximateByteSize()>0),ac:a}:{ac:a}}xu(e){return this.current&&e==="Offline"?(this.current=!1,this.applyChanges({Yu:this.Yu,ec:new jC,mutatedKeys:this.mutatedKeys,Oo:!1},!1)):{ac:[]}}uc(e){return!this.zu.has(e)&&!!this.Yu.has(e)&&!this.Yu.get(e).hasLocalMutations}_c(e){e&&(e.addedDocuments.forEach((t=>this.zu=this.zu.add(t))),e.modifiedDocuments.forEach((t=>{})),e.removedDocuments.forEach((t=>this.zu=this.zu.delete(t))),this.current=e.current)}oc(){if(!this.current)return[];const e=this.Hu;this.Hu=ae(),this.Yu.forEach((n=>{this.uc(n.key)&&(this.Hu=this.Hu.add(n.key))}));const t=[];return e.forEach((n=>{this.Hu.has(n)||t.push(new QE(n))})),this.Hu.forEach((n=>{e.has(n)||t.push(new $E(n))})),t}cc(e){this.zu=e.Wo,this.Hu=ae();const t=this.Xu(e.documents);return this.applyChanges(t,!0)}lc(){return pi.fromInitialDocuments(this.query,this.Yu,this.mutatedKeys,this.ju===0,this.hasCachedResults)}}const Si="SyncEngine";class uS{constructor(e,t,n){this.query=e,this.targetId=t,this.view=n}}class lS{constructor(e){this.key=e,this.Ec=!1}}class BS{constructor(e,t,n,s,i,o){this.localStore=e,this.remoteStore=t,this.eventManager=n,this.sharedClientState=s,this.currentUser=i,this.maxConcurrentLimboResolutions=o,this.hc={},this.Tc=new Gn((a=>aE(a)),Du),this.Pc=new Map,this.Ic=new Set,this.Rc=new Ie(K.comparator),this.Ac=new Map,this.Vc=new qh,this.dc={},this.fc=new Map,this.mc=Ln.bs(),this.onlineState="Unknown",this.gc=void 0}get isPrimaryClient(){return this.gc===!0}}async function hS(r,e,t=!0){const n=Ou(r);let s;const i=n.Tc.get(e);return i?(n.sharedClientState.addLocalQueryTarget(i.targetId),s=i.view.lc()):s=await WE(n,e,t,!0),s}async function fS(r,e){const t=Ou(r);await WE(t,e,!0,!1)}async function WE(r,e,t,n){const s=await Hc(r.localStore,Pe(e)?e:Ot(e)),i=s.targetId,o=r.sharedClientState.addLocalQueryTarget(i,t);let a;return n&&(a=await af(r,e,i,o==="current",s.resumeToken)),r.isPrimaryClient&&t&&Nu(r.remoteStore,s),a}async function af(r,e,t,n,s){r.yc=(f,p,m)=>(async function(F,V,j,Y){let ee=V.view.Xu(j);ee.Oo&&(ee=await AB(F.localStore,V.query,!1).then((({documents:T})=>V.view.Xu(T,ee))));const se=Y&&Y.targetChanges.get(V.targetId),fe=Y&&Y.targetMismatches.get(V.targetId)!=null,oe=V.view.applyChanges(ee,F.isPrimaryClient,se,fe);return NB(F,V.targetId,oe.ac),oe.snapshot})(r,f,p,m);const i=await AB(r.localStore,e,!0),o=new cS(e,i.Wo),a=o.Xu(i.documents),c=aa.createSynthesizedTargetChangeForCurrentChange(t,n&&r.onlineState!=="Offline",s),l=o.applyChanges(a,r.isPrimaryClient,c);NB(r,t,l.ac);const B=new uS(e,t,o);return r.Tc.set(e,B),r.Pc.has(t)?r.Pc.get(t).push(e):r.Pc.set(t,[e]),l.snapshot}async function dS(r,e,t){const n=Q(r),s=n.Tc.get(e),i=n.Pc.get(s.targetId);if(i.length>1)return n.Pc.set(s.targetId,i.filter((o=>!Du(o,e)))),void n.Tc.delete(e);n.isPrimaryClient?(n.sharedClientState.removeLocalQueryTarget(s.targetId),n.sharedClientState.isActiveQueryTarget(s.targetId)||await fi(n.localStore,s.targetId,!1).then((()=>{n.sharedClientState.clearQueryState(s.targetId),t&&di(n.remoteStore,s.targetId),Ci(n,s.targetId)})).catch(br)):(Ci(n,s.targetId),await fi(n.localStore,s.targetId,!0))}async function pS(r,e){const t=Q(r),n=t.Tc.get(e),s=t.Pc.get(n.targetId);t.isPrimaryClient&&s.length===1&&(t.sharedClientState.removeLocalQueryTarget(n.targetId),di(t.remoteStore,n.targetId))}async function CS(r,e,t){const n=Bf(r);try{const s=await(function(o,a){const c=Q(o),l=ge.now(),B=a.reduce(((m,y)=>m.add(y.key)),ae());let f,p;return c.persistence.runTransaction("Locally write mutations","readwrite",(m=>{let y=Me(),F=ae();return c.ko.getEntries(m,B).next((V=>{y=V,y.forEach(((j,Y)=>{Y.isValidDocument()||(F=F.add(j))}))})).next((()=>c.localDocuments.getOverlayedDocuments(m,y))).next((V=>{f=V;const j=[];for(const Y of a){const ee=tA(Y,f.get(Y.key).overlayedDocument);ee!=null&&j.push(new Mn(Y.key,ee,Km(ee.value.mapValue),ve.exists(!0)))}return c.mutationQueue.addMutationBatch(m,l,j,a)})).next((V=>{p=V;const j=V.applyToLocalDocumentSet(f,F);return c.documentOverlayCache.saveOverlays(m,V.batchId,j)}))})).then((()=>({batchId:p.batchId,changes:h_(f)})))})(n.localStore,e);n.sharedClientState.addPendingMutation(s.batchId),(function(o,a,c){let l=o.dc[o.currentUser.toKey()];l||(l=new Ie(ie)),l=l.insert(a,c),o.dc[o.currentUser.toKey()]=l})(n,s.batchId,t),await Pr(n,s.changes),await Ri(n.remoteStore)}catch(s){const i=ef(s,"Failed to persist write");t.reject(i)}}async function YE(r,e){const t=Q(r);try{const n=await Ub(t.localStore,e);e.targetChanges.forEach(((s,i)=>{const o=t.Ac.get(i);o&&(H(s.addedDocuments.size+s.modifiedDocuments.size+s.removedDocuments.size<=1,22616),s.addedDocuments.size>0?o.Ec=!0:s.modifiedDocuments.size>0?H(o.Ec,14607):s.removedDocuments.size>0&&(H(o.Ec,42227),o.Ec=!1))})),await Pr(t,n,e)}catch(n){await br(n)}}function JC(r,e,t){const n=Q(r);if(n.isPrimaryClient&&t===0||!n.isPrimaryClient&&t===1){const s=[];n.Tc.forEach(((i,o)=>{const a=o.view.xu(e);a.snapshot&&s.push(a.snapshot)})),(function(o,a){const c=Q(o);c.onlineState=a;let l=!1;c.queries.forEach(((B,f)=>{for(const p of f.bu)p.xu(a)&&(l=!0)})),l&&sf(c)})(n.eventManager,e),s.length&&n.hc.Tn(s),n.onlineState=e,n.isPrimaryClient&&n.sharedClientState.setOnlineState(e)}}async function gS(r,e,t){const n=Q(r);n.sharedClientState.updateQueryState(e,"rejected",t);const s=n.Ac.get(e),i=s&&s.key;if(i){let o=new Ie(K.comparator);o=o.insert(i,Ae.newNoDocument(i,X.min()));const a=ae().add(i),c=new yi(X.min(),new Map,new Ie(ie),o,Me(),a);await YE(n,c),n.Rc=n.Rc.remove(i),n.Ac.delete(e),lf(n)}else await fi(n.localStore,e,!1).then((()=>Ci(n,e,t))).catch(br)}async function mS(r,e){const t=Q(r),n=e.batch.batchId;try{const s=await Gb(t.localStore,e);uf(t,n,null),cf(t,n),t.sharedClientState.updateMutationState(n,"acknowledged"),await Pr(t,s)}catch(s){await br(s)}}async function _S(r,e,t){const n=Q(r);try{const s=await(function(o,a){const c=Q(o);return c.persistence.runTransaction("Reject batch","readwrite-primary",(l=>{let B;return c.mutationQueue.lookupMutationBatch(l,a).next((f=>(H(f!==null,37113),B=f.keys(),c.mutationQueue.removeMutationBatch(l,f)))).next((()=>c.mutationQueue.performConsistencyCheck(l))).next((()=>c.documentOverlayCache.removeOverlaysForBatchId(l,B,a))).next((()=>c.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(l,B))).next((()=>c.localDocuments.getDocuments(l,B)))}))})(n.localStore,e);uf(n,e,t),cf(n,e),n.sharedClientState.updateMutationState(e,"rejected",t),await Pr(n,s)}catch(s){await br(s)}}function cf(r,e){(r.fc.get(e)||[]).forEach((t=>{t.resolve()})),r.fc.delete(e)}function uf(r,e,t){const n=Q(r);let s=n.dc[n.currentUser.toKey()];if(s){const i=s.get(e);i&&(t?i.reject(t):i.resolve(),s=s.remove(e)),n.dc[n.currentUser.toKey()]=s}}function Ci(r,e,t=null){r.sharedClientState.removeLocalQueryTarget(e);for(const n of r.Pc.get(e))r.Tc.delete(n),t&&r.hc.wc(n,t);r.Pc.delete(e),r.isPrimaryClient&&r.Vc.e_(e).forEach((n=>{r.Vc.containsKey(n)||XE(r,n)}))}function XE(r,e){r.Ic.delete(e.path.canonicalString());const t=r.Rc.get(e);t!==null&&(di(r.remoteStore,t),r.Rc=r.Rc.remove(e),r.Ac.delete(t),lf(r))}function NB(r,e,t){for(const n of t)n instanceof $E?(r.Vc.addReference(n.key,e),ES(r,n)):n instanceof QE?(G(Si,"Document no longer in limbo: "+n.key),r.Vc.removeReference(n.key,e),r.Vc.containsKey(n.key)||XE(r,n.key)):z(19791,{bc:n})}function ES(r,e){const t=e.key,n=t.path.canonicalString();r.Rc.get(t)||r.Ic.has(n)||(G(Si,"New document in limbo: "+t),r.Ic.add(n),lf(r))}function lf(r){for(;r.Ic.size>0&&r.Rc.size<r.maxConcurrentLimboResolutions;){const e=r.Ic.values().next().value;r.Ic.delete(e);const t=new K(le.fromString(e)),n=r.mc.next();r.Ac.set(n,new lS(t)),r.Rc=r.Rc.insert(t,n),Nu(r.remoteStore,new Bn(Ot(oa(t.path)),n,"TargetPurposeLimboResolution",Et.wn))}}async function Pr(r,e,t){const n=Q(r),s=[],i=[],o=[];n.Tc.isEmpty()||(n.Tc.forEach(((a,c)=>{o.push(n.yc(c,e,t).then((l=>{if((l||t)&&n.isPrimaryClient){const B=l?!l.fromCache:t?.targetChanges.get(c.targetId)?.current;n.sharedClientState.updateQueryState(c.targetId,B?"current":"not-current")}if(l){s.push(l);const B=zh.mo(c.targetId,l);i.push(B)}})))})),await Promise.all(o),n.hc.Tn(s),await(async function(c,l){const B=Q(c);try{await B.persistence.runTransaction("notifyLocalViewChanges","readwrite",(f=>b.forEach(l,(p=>b.forEach(p.Vo,(m=>B.persistence.referenceDelegate.addReference(f,p.targetId,m))).next((()=>b.forEach(p.fo,(m=>B.persistence.referenceDelegate.removeReference(f,p.targetId,m)))))))))}catch(f){if(!Sr(f))throw f;G($h,"Failed to update sequence numbers: "+f)}for(const f of l){const p=f.targetId;if(!f.fromCache){const m=B.Lo.get(p),y=m.snapshotVersion,F=m.withLastLimboFreeSnapshotVersion(y);B.Lo=B.Lo.insert(p,F)}}})(n.localStore,i))}async function IS(r,e){const t=Q(r);if(!t.currentUser.isEqual(e)){G(Si,"User change. New user:",e.toKey());const n=await FE(t.localStore,e);t.currentUser=e,(function(i,o){i.fc.forEach((a=>{a.forEach((c=>{c.reject(new U(O.CANCELLED,o))}))})),i.fc.clear()})(t,"'waitForPendingWrites' promise is rejected due to a user change."),t.sharedClientState.handleUserChange(e,n.removedBatchIds,n.addedBatchIds),await Pr(t,n.$o)}}function DS(r,e){const t=Q(r),n=t.Ac.get(e);if(n&&n.Ec)return ae().add(n.key);{let s=ae();const i=t.Pc.get(e);if(!i)return s;for(const o of i??[]){const a=t.Tc.get(o);s=s.unionWith(a.view.Zu)}return s}}async function yS(r,e){const t=Q(r),n=await AB(t.localStore,e.query,!0),s=e.view.cc(n);return t.isPrimaryClient&&NB(t,e.targetId,s.ac),s}async function TS(r,e){const t=Q(r);return vB(t.localStore,e).then((n=>Pr(t,n)))}async function wS(r,e,t,n){const s=Q(r),i=await(function(a,c){const l=Q(a),B=Q(l.mutationQueue);return l.persistence.runTransaction("Lookup mutation documents","readonly",(f=>B.Wr(f,c).next((p=>p?l.localDocuments.getDocuments(f,p):b.resolve(null)))))})(s.localStore,e);i!==null?(t==="pending"?await Ri(s.remoteStore):t==="acknowledged"||t==="rejected"?(uf(s,e,n||null),cf(s,e),(function(a,c){Q(Q(a).mutationQueue).Hr(c)})(s.localStore,e)):z(6720,"Unknown batchState",{Sc:t}),await Pr(s,i)):G(Si,"Cannot apply mutation batch with id: "+e)}async function AS(r,e){const t=Q(r);if(Ou(t),Bf(t),e===!0&&t.gc!==!0){const n=t.sharedClientState.getAllActiveQueryTargets(),s=await zC(t,n.toArray());t.gc=!0,await bB(t.remoteStore,!0);for(const i of s)Nu(t.remoteStore,i)}else if(e===!1&&t.gc!==!1){const n=[];let s=Promise.resolve();t.Pc.forEach(((i,o)=>{t.sharedClientState.isLocalQueryTarget(o)?n.push(o):s=s.then((()=>(Ci(t,o),fi(t.localStore,o,!0)))),di(t.remoteStore,o)})),await s,await zC(t,n),(function(o){const a=Q(o);a.Ac.forEach(((c,l)=>{di(a.remoteStore,l)})),a.Vc.t_(),a.Ac=new Map,a.Rc=new Ie(K.comparator)})(t),t.gc=!1,await bB(t.remoteStore,!1)}}async function zC(r,e,t){const n=Q(r),s=[],i=[];for(const o of e){let a;const c=n.Pc.get(o);if(c&&c.length!==0){a=await Hc(n.localStore,Pe(c[0])?c[0]:Ot(c[0]));for(const l of c){const B=n.Tc.get(l),f=await yS(n,B);f.snapshot&&i.push(f.snapshot)}}else{const l=await kE(n.localStore,o);a=await Hc(n.localStore,l),await af(n,ZE(l),o,!1,a.resumeToken)}s.push(a)}return n.hc.Tn(i),s}function ZE(r){return Dn(r)?r:a_(r.path,r.collectionGroup,r.orderBy,r.filters,r.limit,"F",r.startAt,r.endAt)}function vS(r){return(function(t){return Q(Q(t).persistence).Ro()})(Q(r).localStore)}async function RS(r,e,t,n){const s=Q(r);if(s.gc)return void G(Si,"Ignoring unexpected query state notification.");const i=s.Pc.get(e);if(i&&i.length>0)switch(t){case"current":case"not-current":{let o;if(Pe(i[0]))switch(vn(i[0])){case"collection_group":case"collection":o=await vB(s.localStore,eE(i[0]));break;case"documents":o=await(function(l,B){const f=Q(l),p=ae(...Oc(B).map((m=>K.fromPath(m))));return f.persistence.runTransaction("Get documents for pipeline","readonly",(m=>f.ko.getEntries(m,p))).then((m=>m))})(s.localStore,i[0]);break;default:Yt(""),o=jr()}else o=await vB(s.localStore,(function(l){return l.collectionGroup||(l.path.length%2==1?l.path.lastSegment():l.path.get(l.path.length-2))})(i[0]));const a=yi.createSynthesizedRemoteEventForCurrentChange(e,t==="current",be.EMPTY_BYTE_STRING);await Pr(s,o,a);break}case"rejected":await fi(s.localStore,e,!0),Ci(s,e,n);break;default:z(64155,t)}}async function bS(r,e,t){const n=Ou(r);if(n.gc){for(const s of e){if(n.Pc.has(s)&&n.sharedClientState.isActiveQueryTarget(s)){G(Si,"Adding an already active target "+s);continue}const i=await kE(n.localStore,s),o=await Hc(n.localStore,i);await af(n,ZE(i),o.targetId,!1,o.resumeToken),Nu(n.remoteStore,o)}for(const s of t)n.Pc.has(s)&&await fi(n.localStore,s,!1).then((()=>{di(n.remoteStore,s),Ci(n,s)})).catch(br)}}function Ou(r){const e=Q(r);return e.remoteStore.remoteSyncer.applyRemoteEvent=YE.bind(null,e),e.remoteStore.remoteSyncer.getRemoteKeysForTarget=DS.bind(null,e),e.remoteStore.remoteSyncer.rejectListen=gS.bind(null,e),e.hc.Tn=oS.bind(null,e.eventManager),e.hc.wc=aS.bind(null,e.eventManager),e}function Bf(r){const e=Q(r);return e.remoteStore.remoteSyncer.applySuccessfulWrite=mS.bind(null,e),e.remoteStore.remoteSyncer.rejectFailedWrite=_S.bind(null,e),e}class zo{constructor(){this.kind="memory",this.synchronizeTabs=!1}async initialize(e){this.serializer=pu(e.databaseInfo.databaseId),this.sharedClientState=this.vc(e),this.persistence=this.Dc(e),await this.persistence.start(),this.localStore=this.xc(e),this.gcScheduler=this.Cc(e,this.localStore),this.indexBackfillerScheduler=this.Fc(e,this.localStore)}Cc(e,t){return null}Fc(e,t){return null}xc(e){return OE(this.persistence,new NE,e.initialUser,this.serializer)}Dc(e){return new jh(Su.b_,this.serializer)}vc(e){return new JE}async terminate(){this.gcScheduler?.stop(),this.indexBackfillerScheduler?.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}zo.provider={build:()=>new zo};class SS extends zo{constructor(e){super(),this.cacheSizeBytes=e}Cc(e,t){H(this.persistence.referenceDelegate instanceof Uc,46915);const n=this.persistence.referenceDelegate.garbageCollector;return new x_(n,e.asyncQueue,t)}Dc(e){const t=this.cacheSizeBytes!==void 0?nt.withCacheSize(this.cacheSizeBytes):nt.DEFAULT;return new jh((n=>Uc.b_(n,t)),this.serializer)}}class eI extends zo{constructor(e,t,n){super(),this.Oc=e,this.cacheSizeBytes=t,this.forceOwnership=n,this.kind="persistent",this.synchronizeTabs=!1}async initialize(e){await super.initialize(e),await this.Oc.initialize(this,e),await Bf(this.Oc.syncEngine),await Ri(this.Oc.remoteStore),await this.persistence.eo((()=>(this.gcScheduler&&!this.gcScheduler.started&&this.gcScheduler.start(),this.indexBackfillerScheduler&&!this.indexBackfillerScheduler.started&&this.indexBackfillerScheduler.start(),Promise.resolve())))}xc(e){return OE(this.persistence,new NE,e.initialUser,this.serializer)}Cc(e,t){const n=this.persistence.referenceDelegate.garbageCollector;return new x_(n,e.asyncQueue,t)}Fc(e,t){const n=new rS(t,this.persistence);return new nS(e.asyncQueue,n)}Dc(e){const t=Jh(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey),n=this.cacheSizeBytes!==void 0?nt.withCacheSize(this.cacheSizeBytes):nt.DEFAULT;return new Kh(this.synchronizeTabs,t,e.clientId,n,e.asyncQueue,zE(),fc(),this.serializer,this.sharedClientState,!!this.forceOwnership)}vc(e){return new JE}}class PS extends eI{constructor(e,t){super(e,t,!1),this.Oc=e,this.cacheSizeBytes=t,this.synchronizeTabs=!0}async initialize(e){await super.initialize(e);const t=this.Oc.syncEngine;this.sharedClientState instanceof Nl&&(this.sharedClientState.syncEngine={Au:wS.bind(null,t),Vu:RS.bind(null,t),du:bS.bind(null,t),Ro:vS.bind(null,t),Ru:TS.bind(null,t)},await this.sharedClientState.start()),await this.persistence.eo((async n=>{await AS(this.Oc.syncEngine,n),this.gcScheduler&&(n&&!this.gcScheduler.started?this.gcScheduler.start():n||this.gcScheduler.stop()),this.indexBackfillerScheduler&&(n&&!this.indexBackfillerScheduler.started?this.indexBackfillerScheduler.start():n||this.indexBackfillerScheduler.stop())}))}vc(e){const t=zE();if(!Nl.Ye(t))throw new U(O.UNIMPLEMENTED,"IndexedDB persistence is only available on platforms that support LocalStorage.");const n=Jh(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey);return new Nl(t,e.asyncQueue,n,e.clientId,e.initialUser)}}class $o{async initialize(e,t){this.localStore||(this.localStore=e.localStore,this.sharedClientState=e.sharedClientState,this.datastore=this.createDatastore(t),this.remoteStore=this.createRemoteStore(t),this.eventManager=this.createEventManager(t),this.syncEngine=this.createSyncEngine(t,!e.synchronizeTabs),this.sharedClientState.onlineStateHandler=n=>JC(this.syncEngine,n,1),this.remoteStore.remoteSyncer.handleCredentialChange=IS.bind(null,this.syncEngine),await bB(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(e){return(function(){return new iS})()}createDatastore(e){const t=pu(e.databaseInfo.databaseId),n=zA(e.databaseInfo);return XA(e.authCredentials,e.appCheckCredentials,n,t)}createRemoteStore(e){return(function(n,s,i,o,a){return new Kb(n,s,i,o,a)})(this.localStore,this.datastore,e.asyncQueue,(t=>JC(this.syncEngine,t,0)),(function(){return uC.Ye()?new uC:new qA})())}createSyncEngine(e,t){return(function(s,i,o,a,c,l,B){const f=new BS(s,i,o,a,c,l);return B&&(f.gc=!0),f})(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,e.initialUser,e.maxConcurrentLimboResolutions,t)}async terminate(){await(async function(t){const n=Q(t);G(En,"RemoteStore shutting down."),n.la.add(5),await pa(n),n.ha.shutdown(),n.Ta.set("Unknown")})(this.remoteStore),this.datastore?.terminate(),this.eventManager?.terminate()}}$o.provider={build:()=>new $o};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let NS=class{constructor(e){this.datastore=e,this.readVersions=new Map,this.mutations=[],this.committed=!1,this.lastTransactionError=null,this.writtenDocs=new Set}async lookup(e){if(this.ensureCommitNotCalled(),this.mutations.length>0)throw this.lastTransactionError=new U(O.INVALID_ARGUMENT,"Firestore transactions require all reads to be executed before all writes."),this.lastTransactionError;const t=await(async function(s,i){const o=Q(s),a={documents:i.map((f=>ci(o.serializer,f)))},c=await o._t("BatchGetDocuments",o.serializer.databaseId,le.emptyPath(),a,i.length),l=new Map;c.forEach((f=>{const p=RA(o.serializer,f);l.set(p.key.toString(),p)}));const B=[];return i.forEach((f=>{const p=l.get(f.toString());H(!!p,55234,{key:f}),B.push(p)})),B})(this.datastore,e);return t.forEach((n=>this.recordVersion(n))),t}set(e,t){this.write(t.toMutation(e,this.precondition(e))),this.writtenDocs.add(e.toString())}update(e,t){try{this.write(t.toMutation(e,this.preconditionForUpdate(e)))}catch(n){this.lastTransactionError=n}this.writtenDocs.add(e.toString())}delete(e){this.write(new Ii(e,this.precondition(e))),this.writtenDocs.add(e.toString())}async commit(){if(this.ensureCommitNotCalled(),this.lastTransactionError)throw this.lastTransactionError;const e=this.readVersions;this.mutations.forEach((t=>{e.delete(t.key.toString())})),e.forEach(((t,n)=>{const s=K.fromPath(n);this.mutations.push(new sh(s,this.precondition(s)))})),await(async function(n,s){const i=Q(n),o={writes:s.map((a=>xo(i.serializer,a)))};await i.nt("Commit",i.serializer.databaseId,le.emptyPath(),o)})(this.datastore,this.mutations),this.committed=!0}recordVersion(e){let t;if(e.isFoundDocument())t=e.version;else{if(!e.isNoDocument())throw z(50498,{Mc:e.constructor.name});t=X.min()}const n=this.readVersions.get(e.key.toString());if(n){if(!t.isEqual(n))throw new U(O.ABORTED,"Document version changed between two reads.")}else this.readVersions.set(e.key.toString(),t)}precondition(e){const t=this.readVersions.get(e.toString());return!this.writtenDocs.has(e.toString())&&t?t.isEqual(X.min())?ve.exists(!1):ve.updateTime(t):ve.none()}preconditionForUpdate(e){const t=this.readVersions.get(e.toString());if(!this.writtenDocs.has(e.toString())&&t){if(t.isEqual(X.min()))throw new U(O.INVALID_ARGUMENT,"Can't update a document that doesn't exist.");return ve.updateTime(t)}return ve.exists(!0)}write(e){this.ensureCommitNotCalled(),this.mutations.push(e)}ensureCommitNotCalled(){}};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class OS{constructor(e,t,n,s,i){this.asyncQueue=e,this.datastore=t,this.options=n,this.updateFunction=s,this.deferred=i,this.Nc=n.maxAttempts,this.Ht=new dh(this.asyncQueue,"transaction_retry")}Lc(){this.Nc-=1,this.Bc()}Bc(){this.Ht.kt((async()=>{const e=new NS(this.datastore),t=this.Uc(e);t&&t.then((n=>{this.asyncQueue.enqueueAndForget((()=>e.commit().then((()=>{this.deferred.resolve(n)})).catch((s=>{this.kc(s)}))))})).catch((n=>{this.kc(n)}))}))}Uc(e){try{const t=this.updateFunction(e);return!ia(t)&&t.catch&&t.then?t:(this.deferred.reject(Error("Transaction callback must return a Promise")),null)}catch(t){return this.deferred.reject(t),null}}kc(e){this.Nc>0&&this.qc(e)?(this.Nc-=1,this.asyncQueue.enqueueAndForget((()=>(this.Bc(),Promise.resolve())))):this.deferred.reject(e)}qc(e){if(e?.name==="FirebaseError"){const t=e.code;return t==="aborted"||t==="failed-precondition"||t==="already-exists"||!u_(t)}return!1}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Tr="FirestoreClient";class FS{constructor(e,t,n,s,i){this.authCredentials=e,this.appCheckCredentials=t,this.asyncQueue=n,this._databaseInfo=s,this.user=tt.UNAUTHENTICATED,this.clientId=XB.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=i,this.authCredentials.start(n,(async o=>{G(Tr,"Received user=",o.uid),await this.authCredentialListener(o),this.user=o})),this.appCheckCredentials.start(n,(o=>(G(Tr,"Received new app check token=",o),this.appCheckCredentialListener(o,this.user))))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this._databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(e){this.authCredentialListener=e}setAppCheckTokenChangeListener(e){this.appCheckCredentialListener=e}terminate(){this.asyncQueue.enterRestrictedMode();const e=new qt;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted((async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),e.resolve()}catch(t){const n=ef(t,"Failed to shutdown persistence");e.reject(n)}})),e.promise}}async function Ol(r,e){r.asyncQueue.verifyOperationInProgress(),G(Tr,"Initializing OfflineComponentProvider");const t=r.configuration;await e.initialize(t);let n=t.initialUser;r.setCredentialChangeListener((async s=>{n.isEqual(s)||(await FE(e.localStore,s),n=s)})),e.persistence.setDatabaseDeletedListener((()=>r.terminate())),r._offlineComponents=e}async function $C(r,e){r.asyncQueue.verifyOperationInProgress();const t=await LS(r);G(Tr,"Initializing OnlineComponentProvider"),await e.initialize(t,r.configuration),r.setCredentialChangeListener((n=>UC(e.remoteStore,n))),r.setAppCheckTokenChangeListener(((n,s)=>UC(e.remoteStore,s))),r._onlineComponents=e}async function LS(r){if(!r._offlineComponents)if(r._uninitializedComponentsProvider){G(Tr,"Using user provided OfflineComponentProvider");try{await Ol(r,r._uninitializedComponentsProvider._offline)}catch(e){const t=e;if(!(function(s){return s.name==="FirebaseError"?s.code===O.FAILED_PRECONDITION||s.code===O.UNIMPLEMENTED:!(typeof DOMException<"u"&&s instanceof DOMException)||s.code===22||s.code===20||s.code===11})(t))throw t;Yt("Error using user provided cache. Falling back to memory cache: "+t),await Ol(r,new zo)}}else G(Tr,"Using default OfflineComponentProvider"),await Ol(r,new SS(void 0));return r._offlineComponents}async function hf(r){return r._onlineComponents||(r._uninitializedComponentsProvider?(G(Tr,"Using user provided OnlineComponentProvider"),await $C(r,r._uninitializedComponentsProvider._online)):(G(Tr,"Using default OnlineComponentProvider"),await $C(r,new $o))),r._onlineComponents}function kS(r){return hf(r).then((e=>e.syncEngine))}function xS(r){return hf(r).then((e=>e.datastore))}async function Jc(r){const e=await hf(r),t=e.eventManager;return t.onListen=hS.bind(null,e.syncEngine),t.onUnlisten=dS.bind(null,e.syncEngine),t.onFirstRemoteStoreListen=fS.bind(null,e.syncEngine),t.onLastRemoteStoreUnlisten=pS.bind(null,e.syncEngine),t}function VS(r,e,t,n){const s=new Xh(n),i=new of(e,s,t);return r.asyncQueue.enqueueAndForget((async()=>nf(await Jc(r),i))),()=>{s.Va(),r.asyncQueue.enqueueAndForget((async()=>rf(await Jc(r),i)))}}function MS(r,e,t={}){const n=new qt;return r.asyncQueue.enqueueAndForget((async()=>(function(i,o,a,c,l){const B=new Xh({next:p=>{B.Va(),o.enqueueAndForget((()=>rf(i,f)));const m=p.docs.has(a);!m&&p.fromCache?l.reject(new U(O.UNAVAILABLE,"Failed to get document because the client is offline.")):m&&p.fromCache&&c&&c.source==="server"?l.reject(new U(O.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):l.resolve(p)},error:p=>l.reject(p)}),f=new of(oa(a.path),B,{includeMetadataChanges:!0,waitForSyncWhenOnline:!0});return nf(i,f)})(await Jc(r),r.asyncQueue,e,t,n))),n.promise}function GS(r,e,t={}){const n=new qt;return r.asyncQueue.enqueueAndForget((async()=>(function(i,o,a,c,l){const B=new Xh({next:p=>{B.Va(),o.enqueueAndForget((()=>rf(i,f))),p.fromCache&&c.source==="server"?l.reject(new U(O.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):l.resolve(p)},error:p=>l.reject(p)}),f=new of(a instanceof mo?xR(a):a,B,{includeMetadataChanges:!0,waitForSyncWhenOnline:!0});return nf(i,f)})(await Jc(r),r.asyncQueue,e,t,n))),n.promise}function US(r,e){const t=new qt;return r.asyncQueue.enqueueAndForget((async()=>CS(await kS(r),e,t))),t.promise}function HS(r,e,t){const n=new qt;return r.asyncQueue.enqueueAndForget((async()=>{const s=await xS(r);new OS(r.asyncQueue,s,t,e,n).Lc()})),n.promise}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let zc=class{constructor(e,t,n,s,i){this._firestore=e,this._userDataWriter=t,this._key=n,this._document=s,this._converter=i}get id(){return this._key.path.lastSegment()}get ref(){return new Re(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const e=new qS(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}_fieldsProto(){return this._document?.data.clone().value.mapValue.fields??void 0}get(e){if(this._document){const t=this._document.data.field(On("DocumentSnapshot.get",e));if(t!==null)return this._userDataWriter.convertValue(t)}}},qS=class extends zc{data(){return super.data()}};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tI{convertValue(e,t="none"){switch(xe(e)){case 0:return null;case 1:return e.booleanValue;case 2:return ye(e.integerValue||e.doubleValue);case 3:return this.convertTimestamp(e.timestampValue);case 4:return this.convertServerTimestamp(e,t);case 5:return e.stringValue;case 6:return this.convertBytes(Nn(e.bytesValue));case 7:return this.convertReference(e.referenceValue);case 8:return this.convertGeoPoint(e.geoPointValue);case 9:return this.convertArray(e.arrayValue,t);case 11:return this.convertObject(e.mapValue,t);case 10:return this.convertVectorValue(e.mapValue);default:throw z(62114,{value:e})}}convertObject(e,t){return this.convertObjectMap(e.fields,t)}convertObjectMap(e,t="none"){const n={};return Rr(e,((s,i)=>{n[s]=this.convertValue(i,t)})),n}convertVectorValue(e){const t=e.fields?.[Bs].arrayValue?.values?.map((n=>ye(n.doubleValue)));return new Cn(t)}convertGeoPoint(e){return new dn(ye(e.latitude),ye(e.longitude))}convertArray(e,t){return(e.values||[]).map((n=>this.convertValue(n,t)))}convertServerTimestamp(e,t){switch(t){case"previous":const n=sa(e);return n==null?null:this.convertValue(n,t);case"estimate":return this.convertTimestamp(Zs(e));default:return null}}convertTimestamp(e){const t=Pn(e);return new ge(t.seconds,t.nanos)}convertDocumentKey(e,t){const n=le.fromString(e);H(v_(n),9688,{name:e});const s=new ls(n.get(1),n.get(3)),i=new K(n.popFirst(5));return s.isEqual(t)||Fe(`A document reference to ${i} refers to a different database (${s.projectId}/${s.database}), which is not supported. It will be treated as a reference in the current database (${t.projectId}/${t.database}) instead.`),i}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Fu(r,e,t){let n;return n=r?t&&(t.merge||t.mergeFields)?r.toFirestore(e,t):r.toFirestore(e):e,n}class jS extends tI{constructor(e){super(),this.firestore=e}convertBytes(e){return new St(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new Re(this.firestore,null,t)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const QC="AsyncQueue";class WC{constructor(e=Promise.resolve()){this.$c=[],this.Kc=!1,this.Qc=[],this.Wc=null,this.Gc=!1,this.zc=!1,this.jc=[],this.Ht=new dh(this,"async_queue_retry"),this.Hc=()=>{const n=fc();n&&G(QC,"Visibility state changed to "+n.visibilityState),this.Ht.$t()},this.Jc=e;const t=fc();t&&typeof t.addEventListener=="function"&&t.addEventListener("visibilitychange",this.Hc)}get isShuttingDown(){return this.Kc}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.Yc(),this.Zc(e)}enterRestrictedMode(e){if(!this.Kc){this.Kc=!0,this.zc=e||!1;const t=fc();t&&typeof t.removeEventListener=="function"&&t.removeEventListener("visibilitychange",this.Hc)}}enqueue(e){if(this.Yc(),this.Kc)return new Promise((()=>{}));const t=new qt;return this.Zc((()=>this.Kc&&this.zc?Promise.resolve():(e().then(t.resolve,t.reject),t.promise))).then((()=>t.promise))}enqueueRetryable(e){this.enqueueAndForget((()=>(this.$c.push(e),this.Xc())))}async Xc(){if(this.$c.length!==0){try{await this.$c[0](),this.$c.shift(),this.Ht.reset()}catch(e){if(!Sr(e))throw e;G(QC,"Operation failed with retryable error: "+e)}this.$c.length>0&&this.Ht.kt((()=>this.Xc()))}}Zc(e){const t=this.Jc.then((()=>(this.Gc=!0,e().catch((n=>{throw this.Wc=n,this.Gc=!1,Fe("INTERNAL UNHANDLED ERROR: ",YC(n)),n})).then((n=>(this.Gc=!1,n))))));return this.Jc=t,t}enqueueAfterDelay(e,t,n){this.Yc(),this.jc.indexOf(e)>-1&&(t=0);const s=Zh.createAndSchedule(this,e,t,n,(i=>this.el(i)));return this.Qc.push(s),s}Yc(){this.Wc&&z(47125,{tl:YC(this.Wc)})}verifyOperationInProgress(){}async nl(){let e;do e=this.Jc,await e;while(e!==this.Jc)}rl(e){for(const t of this.Qc)if(t.timerId===e)return!0;return!1}il(e){return this.nl().then((()=>{this.Qc.sort(((t,n)=>t.targetTimeMs-n.targetTimeMs));for(const t of this.Qc)if(t.skipDelay(),e!=="all"&&t.timerId===e)break;return this.nl()}))}sl(e){this.jc.push(e)}el(e){const t=this.Qc.indexOf(e);this.Qc.splice(t,1)}}function YC(r){let e=r.message||"";return r.stack&&(e=r.stack.includes(r.message)?r.stack:r.message+`
`+r.stack),e}class Xt extends Ch{constructor(e,t,n,s){super(e,t,n,s),this.type="firestore",this._queue=new WC,this._persistenceKey=s?.name||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const e=this._firestoreClient.terminate();this._queue=new WC(e),this._firestoreClient=void 0,await e}}}function tx(r,e,t){t||(t=Ac);const n=Zt(r,"firestore");if(n.isInitialized(t)){const s=n.getImmediate({identifier:t}),i=n.getOptions(t);if(Cr(i,e))return s;throw new U(O.FAILED_PRECONDITION,"initializeFirestore() has already been called with different options. To avoid this error, call initializeFirestore() with the same options as when it was originally called, or call getFirestore() to return the already initialized instance.")}if(e.cacheSizeBytes!==void 0&&e.localCache!==void 0)throw new U(O.INVALID_ARGUMENT,"cache and cacheSizeBytes cannot be specified at the same time as cacheSizeBytes willbe deprecated. Instead, specify the cache size in the cache object");if(e.cacheSizeBytes!==void 0&&e.cacheSizeBytes!==-1&&e.cacheSizeBytes<k_)throw new U(O.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");return e.host&&Vn(e.host)&&au(e.host),n.initialize({options:e,instanceIdentifier:t})}function Pi(r){if(r._terminated)throw new U(O.FAILED_PRECONDITION,"The client has already been terminated.");return r._firestoreClient||KS(r),r._firestoreClient}function KS(r){const e=r._freezeSettings(),t=ev(r._databaseId,r._app?.options.appId||"",r._persistenceKey,r._app?.options.apiKey,e);r._componentsProvider||e.localCache?._offlineComponentProvider&&e.localCache?._onlineComponentProvider&&(r._componentsProvider={_offline:e.localCache._offlineComponentProvider,_online:e.localCache._onlineComponentProvider}),r._firestoreClient=new FS(r._authCredentials,r._appCheckCredentials,r._queue,t,r._componentsProvider&&(function(s){const i=s?._online.build();return{_offline:s?._offline.build(i),_online:i}})(r._componentsProvider))}function nx(r){if(r._initialized&&!r._terminated)throw new U(O.FAILED_PRECONDITION,"Persistence can only be cleared before a Firestore instance is initialized or after it is terminated.");const e=new qt;return r._queue.enqueueAndForgetEvenWhileRestricted((async()=>{try{await(async function(n){if(!pn.Ye())return Promise.resolve();const s=n+PE;await pn.delete(s)})(Jh(r._databaseId,r._persistenceKey)),e.resolve()}catch(t){e.reject(t)}})),e.promise}function rx(r){return QT(r.app,"firestore",r._databaseId.database),r._delete()}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Lu extends tI{constructor(e){super(),this.firestore=e}convertBytes(e){return new St(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new Re(this.firestore,null,t)}}class js{constructor(e,t){this.hasPendingWrites=e,this.fromCache=t}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}}class pr extends zc{constructor(e,t,n,s,i,o){super(e,t,n,s,o),this._firestore=e,this._firestoreImpl=e,this.metadata=i}exists(){return super.exists()}data(e={}){if(this._document){if(this._converter){const t=new dc(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(t,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e,t={}){if(this._document){const n=this._document.data.field(On("DocumentSnapshot.get",e));if(n!==null)return this._userDataWriter.convertValue(n,t.serverTimestamps)}}toJSON(){if(this.metadata.hasPendingWrites)throw new U(O.FAILED_PRECONDITION,"DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e=this._document,t={};return t.type=pr._jsonSchemaVersion,t.bundle="",t.bundleSource="DocumentSnapshot",t.bundleName=this._key.toString(),!e||!e.isValidDocument()||!e.isFoundDocument()?t:(this._userDataWriter.convertObjectMap(e.data.value.mapValue.fields,"previous"),t.bundle=(this._firestore,this.ref.path,"NOT SUPPORTED"),t)}}pr._jsonSchemaVersion="firestore/documentSnapshot/1.0",pr._jsonSchema={type:ke("string",pr._jsonSchemaVersion),bundleSource:ke("string","DocumentSnapshot"),bundleName:ke("string"),bundle:ke("string")};class dc extends pr{data(e={}){return super.data(e)}}class ss{constructor(e,t,n,s){this._firestore=e,this._userDataWriter=t,this._snapshot=s,this.metadata=new js(s.hasPendingWrites,s.fromCache),this.query=n}get docs(){const e=[];return this.forEach((t=>e.push(t))),e}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(e,t){this._snapshot.docs.forEach((n=>{e.call(t,new dc(this._firestore,this._userDataWriter,n.key,n,new js(this._snapshot.mutatedKeys.has(n.key),this._snapshot.fromCache),this.query.converter))}))}docChanges(e={}){const t=!!e.includeMetadataChanges;if(t&&this._snapshot.excludesMetadataChanges)throw new U(O.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===t||(this._cachedChanges=(function(s,i){if(s._snapshot.oldDocs.isEmpty()){let o=0;return s._snapshot.docChanges.map((a=>{Pe(s._snapshot.query)?wB(s._snapshot.query):uh(s.query._query);const c=new dc(s._firestore,s._userDataWriter,a.doc.key,a.doc,new js(s._snapshot.mutatedKeys.has(a.doc.key),s._snapshot.fromCache),s.query.converter);return a.doc,{type:"added",doc:c,oldIndex:-1,newIndex:o++}}))}{let o=s._snapshot.oldDocs;return s._snapshot.docChanges.filter((a=>i||a.type!==3)).map((a=>{const c=new dc(s._firestore,s._userDataWriter,a.doc.key,a.doc,new js(s._snapshot.mutatedKeys.has(a.doc.key),s._snapshot.fromCache),s.query.converter);let l=-1,B=-1;return a.type!==0&&(l=o.indexOf(a.doc.key),o=o.delete(a.doc.key)),a.type!==1&&(o=o.add(a.doc),B=o.indexOf(a.doc.key)),{type:JS(a.type),doc:c,oldIndex:l,newIndex:B}}))}})(this,t),this._cachedChangesIncludeMetadataChanges=t),this._cachedChanges}toJSON(){if(this.metadata.hasPendingWrites)throw new U(O.FAILED_PRECONDITION,"QuerySnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e={};e.type=ss._jsonSchemaVersion,e.bundleSource="QuerySnapshot",e.bundleName=XB.newId(),this._firestore._databaseId.database,this._firestore._databaseId.projectId;const t=[],n=[],s=[];return this.docs.forEach((i=>{i._document!==null&&(t.push(i._document),n.push(this._userDataWriter.convertObjectMap(i._document.data.value.mapValue.fields,"previous")),s.push(i.ref.path))})),e.bundle=(this._firestore,this.query._query,e.bundleName,"NOT SUPPORTED"),e}}function JS(r){switch(r){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return z(61501,{type:r})}}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */ss._jsonSchemaVersion="firestore/querySnapshot/1.0",ss._jsonSchema={type:ke("string",ss._jsonSchemaVersion),bundleSource:ke("string","QuerySnapshot"),bundleName:ke("string"),bundle:ke("string")};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function nI(r){if(r.limitType==="L"&&r.explicitOrderBy.length===0)throw new U(O.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}class ff{}class df extends ff{}function sx(r,e,...t){let n=[];e instanceof ff&&n.push(e),n=n.concat(t),(function(i){const o=i.filter((c=>c instanceof pf)).length,a=i.filter((c=>c instanceof ku)).length;if(o>1||o>0&&a>0)throw new U(O.INVALID_ARGUMENT,"InvalidQuery. When using composite filters, you cannot use more than one filter at the top level. Consider nesting the multiple filters within an `and(...)` statement. For example: change `query(query, where(...), or(...))` to `query(query, and(where(...), or(...)))`.")})(n);for(const s of n)r=s._apply(r);return r}class ku extends df{constructor(e,t,n){super(),this._field=e,this._op=t,this._value=n,this.type="where"}static _create(e,t,n){return new ku(e,t,n)}_apply(e){const t=this._parse(e);return rI(e._query,t),new Un(e.firestore,e.converter,BB(e._query,t))}_parse(e){const t=wi(e.firestore);return(function(i,o,a,c,l,B,f){let p;if(l.isKeyField()){if(B==="array-contains"||B==="array-contains-any")throw new U(O.INVALID_ARGUMENT,`Invalid Query. You can't perform '${B}' queries on documentId().`);if(B==="in"||B==="not-in"){ZC(f,B);const y=[];for(const F of f)y.push(XC(c,i,F));p={arrayValue:{values:y}}}else p=XC(c,i,f)}else B!=="in"&&B!=="not-in"&&B!=="array-contains-any"||ZC(f,B),p=lv(a,o,f,B==="in"||B==="not-in");return he.create(l,B,p)})(e._query,"where",t,e.firestore._databaseId,this._field,this._op,this._value)}}function ix(r,e,t){const n=e,s=On("where",r);return ku._create(s,n,t)}class pf extends ff{constructor(e,t){super(),this.type=e,this._queryConstraints=t}static _create(e,t){return new pf(e,t)}_parse(e){const t=this._queryConstraints.map((n=>n._parse(e))).filter((n=>n.getFilters().length>0));return t.length===1?t[0]:_e.create(t,this._getOperator())}_apply(e){const t=this._parse(e);return t.getFilters().length===0?e:((function(s,i){let o=s;const a=i.getFlattenedFilters();for(const c of a)rI(o,c),o=BB(o,c)})(e._query,t),new Un(e.firestore,e.converter,BB(e._query,t)))}_getQueryConstraints(){return this._queryConstraints}_getOperator(){return this.type==="and"?"and":"or"}}class Cf extends df{constructor(e,t){super(),this._field=e,this._direction=t,this.type="orderBy"}static _create(e,t){return new Cf(e,t)}_apply(e){const t=(function(s,i,o){if(s.startAt!==null)throw new U(O.INVALID_ARGUMENT,"Invalid query. You must not call startAt() or startAfter() before calling orderBy().");if(s.endAt!==null)throw new U(O.INVALID_ARGUMENT,"Invalid query. You must not call endAt() or endBefore() before calling orderBy().");return new Lo(i,o)})(e._query,this._field,this._direction);return new Un(e.firestore,e.converter,hA(e._query,t))}}function ox(r,e="asc"){const t=e,n=On("orderBy",r);return Cf._create(n,t)}class gf extends df{constructor(e,t,n){super(),this.type=e,this._limit=t,this._limitType=n}static _create(e,t,n){return new gf(e,t,n)}_apply(e){return new Un(e.firestore,e.converter,Pc(e._query,this._limit,this._limitType))}}function ax(r){return qw("limit",r),gf._create("limit",r,"F")}function XC(r,e,t){if(typeof(t=ce(t))=="string"){if(t==="")throw new U(O.INVALID_ARGUMENT,"Invalid query. When querying with documentId(), you must provide a valid document ID, but it was an empty string.");if(!c_(e)&&t.indexOf("/")!==-1)throw new U(O.INVALID_ARGUMENT,`Invalid query. When querying a collection by documentId(), you must provide a plain document ID, but '${t}' contains a '/' character.`);const n=e.path.child(le.fromString(t));if(!K.isDocumentKey(n))throw new U(O.INVALID_ARGUMENT,`Invalid query. When querying a collection group by documentId(), the value provided must result in a valid document path, but '${n}' is not because it has an odd number of segments (${n.length}).`);return No(r,new K(n))}if(t instanceof Re)return No(r,t._key);throw new U(O.INVALID_ARGUMENT,`Invalid query. When querying with documentId(), you must provide a valid string or a DocumentReference, but it was: ${cu(t)}.`)}function ZC(r,e){if(!Array.isArray(r)||r.length===0)throw new U(O.INVALID_ARGUMENT,`Invalid Query. A non-empty array is required for '${e.toString()}' filters.`)}function rI(r,e){const t=(function(s,i){for(const o of s)for(const a of o.getFlattenedFilters())if(i.indexOf(a.op)>=0)return a.op;return null})(r.filters,(function(s){switch(s){case"!=":return["!=","not-in"];case"array-contains-any":case"in":return["not-in"];case"not-in":return["array-contains-any","in","not-in","!="];default:return[]}})(e.op));if(t!==null)throw t===e.op?new U(O.INVALID_ARGUMENT,`Invalid query. You cannot use more than one '${e.op.toString()}' filter.`):new U(O.INVALID_ARGUMENT,`Invalid query. You cannot use '${e.op.toString()}' filters with '${t.toString()}' filters.`)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function eg(r){return(function(t,n){if(typeof t!="object"||t===null)return!1;const s=t;for(const i of n)if(i in s&&typeof s[i]=="function")return!0;return!1})(r,["next","error","complete"])}class zS{constructor(e){let t;this.kind="persistent",e?.tabManager?(e.tabManager._initialize(e),t=e.tabManager):(t=WS(void 0),t._initialize(e)),this._onlineComponentProvider=t._onlineComponentProvider,this._offlineComponentProvider=t._offlineComponentProvider}toJSON(){return{kind:this.kind}}}function cx(r){return new zS(r)}class $S{constructor(e){this.forceOwnership=e,this.kind="persistentSingleTab"}toJSON(){return{kind:this.kind}}_initialize(e){this._onlineComponentProvider=$o.provider,this._offlineComponentProvider={build:t=>new eI(t,e?.cacheSizeBytes,this.forceOwnership)}}}class QS{constructor(){this.kind="PersistentMultipleTab"}toJSON(){return{kind:this.kind}}_initialize(e){this._onlineComponentProvider=$o.provider,this._offlineComponentProvider={build:t=>new PS(t,e?.cacheSizeBytes)}}}function WS(r){return new $S(r?.forceOwnership)}function ux(){return new QS}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const YS={maxAttempts:5};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class XS{constructor(e,t){this._firestore=e,this._commitHandler=t,this._mutations=[],this._committed=!1,this._dataReader=wi(e)}set(e,t,n){this._verifyNotCommitted();const s=lr(e,this._firestore),i=Fu(s.converter,t,n),o=gu(this._dataReader,"WriteBatch.set",s._key,i,s.converter!==null,n);return this._mutations.push(o.toMutation(s._key,ve.none())),this}update(e,t,n,...s){this._verifyNotCommitted();const i=lr(e,this._firestore);let o;return o=typeof(t=ce(t))=="string"||t instanceof Ti?Ih(this._dataReader,"WriteBatch.update",i._key,t,n,s):Eh(this._dataReader,"WriteBatch.update",i._key,t),this._mutations.push(o.toMutation(i._key,ve.exists(!0))),this}delete(e){this._verifyNotCommitted();const t=lr(e,this._firestore);return this._mutations=this._mutations.concat(new Ii(t._key,ve.none())),this}commit(){return this._verifyNotCommitted(),this._committed=!0,this._mutations.length>0?this._commitHandler(this._mutations):Promise.resolve()}_verifyNotCommitted(){if(this._committed)throw new U(O.FAILED_PRECONDITION,"A write batch can no longer be used after commit() has been called.")}}function lr(r,e){if((r=ce(r)).firestore!==e)throw new U(O.INVALID_ARGUMENT,"Provided document reference is from a different Firestore instance.");return r}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let ZS=class{constructor(e,t){this._firestore=e,this._transaction=t,this._dataReader=wi(e)}get(e){const t=lr(e,this._firestore),n=new jS(this._firestore);return this._transaction.lookup([t._key]).then((s=>{if(!s||s.length!==1)return z(24041);const i=s[0];if(i.isFoundDocument())return new zc(this._firestore,n,i.key,i,t.converter);if(i.isNoDocument())return new zc(this._firestore,n,t._key,null,t.converter);throw z(18433,{doc:i})}))}set(e,t,n){const s=lr(e,this._firestore),i=Fu(s.converter,t,n),o=gu(this._dataReader,"Transaction.set",s._key,i,s.converter!==null,n);return this._transaction.set(s._key,o),this}update(e,t,n,...s){const i=lr(e,this._firestore);let o;return o=typeof(t=ce(t))=="string"||t instanceof Ti?Ih(this._dataReader,"Transaction.update",i._key,t,n,s):Eh(this._dataReader,"Transaction.update",i._key,t),this._transaction.update(i._key,o),this}delete(e){const t=lr(e,this._firestore);return this._transaction.delete(t._key),this}};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eP extends ZS{constructor(e,t){super(e,t),this._firestore=e}get(e){const t=lr(e,this._firestore),n=new Lu(this._firestore);return super.get(e).then((s=>new pr(this._firestore,n,t._key,s._document,new js(!1,!1),t.converter)))}}function Bx(r,e,t){r=dt(r,Xt);const n={...YS,...t};(function(o){if(o.maxAttempts<1)throw new U(O.INVALID_ARGUMENT,"Max attempts must be at least 1")})(n);const s=Pi(r);return HS(s,(i=>e(new eP(r,i))),n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function hx(r){r=dt(r,Re);const e=dt(r.firestore,Xt),t=Pi(e);return MS(t,r._key).then((n=>sI(e,r,n)))}function fx(r){r=dt(r,Un);const e=dt(r.firestore,Xt),t=Pi(e),n=new Lu(e);return nI(r._query),GS(t,r._query).then((s=>new ss(e,n,r,s)))}function dx(r,e,t){r=dt(r,Re);const n=dt(r.firestore,Xt),s=Fu(r.converter,e,t),i=wi(n);return Ca(n,[gu(i,"setDoc",r._key,s,r.converter!==null,t).toMutation(r._key,ve.none())])}function px(r,e,t,...n){r=dt(r,Re);const s=dt(r.firestore,Xt),i=wi(s);let o;return o=typeof(e=ce(e))=="string"||e instanceof Ti?Ih(i,"updateDoc",r._key,e,t,n):Eh(i,"updateDoc",r._key,e),Ca(s,[o.toMutation(r._key,ve.exists(!0))])}function Cx(r){return Ca(dt(r.firestore,Xt),[new Ii(r._key,ve.none())])}function gx(r,e){const t=dt(r.firestore,Xt),n=ov(r),s=Fu(r.converter,e),i=wi(r.firestore);return Ca(t,[gu(i,"addDoc",n._key,s,r.converter!==null,{}).toMutation(n._key,ve.exists(!1))]).then((()=>n))}function mx(r,...e){r=ce(r);let t={includeMetadataChanges:!1,source:"default"},n=0;typeof e[n]!="object"||eg(e[n])||(t=e[n++]);const s={includeMetadataChanges:t.includeMetadataChanges,source:t.source};if(eg(e[n])){const l=e[n];e[n]=l.next?.bind(l),e[n+1]=l.error?.bind(l),e[n+2]=l.complete?.bind(l)}let i,o,a;if(r instanceof Re)o=dt(r.firestore,Xt),a=oa(r._key.path),i={next:l=>{e[n]&&e[n](sI(o,r,l))},error:e[n+1],complete:e[n+2]};else{const l=dt(r,Un);o=dt(l.firestore,Xt),a=l._query;const B=new Lu(o);i={next:f=>{e[n]&&e[n](new ss(o,B,l,f))},error:e[n+1],complete:e[n+2]},nI(r._query)}const c=Pi(o);return VS(c,a,s,i)}function Ca(r,e){const t=Pi(r);return US(t,e)}function sI(r,e,t){const n=t.docs.get(e._key),s=new Lu(r);return new pr(r,s,e._key,n,new js(t.hasPendingWrites,t.fromCache),e.converter)}function _x(r){return r=dt(r,Xt),Pi(r),new XS(r,(e=>Ca(r,e)))}const tg="@firebase/firestore",ng="4.17.2";(function(e,t=!0){kw(Is),Lt(new Dt("firestore",((n,{instanceIdentifier:s,options:i})=>{const o=n.getProvider("app").getImmediate(),a=new Xt(new MA(n.getProvider("auth-internal")),new HA(o,n.getProvider("app-check-internal")),Jw(o,s),o);return i={useFetchStreams:t,...i},a._setSettings(i),a}),"PUBLIC").setMultipleInstances(!0)),Qe(tg,ng,e),Qe(tg,ng,"esm2020")})();var tP="firebase",nP="12.19.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */Qe(tP,nP,"app");function iI(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}const rP=iI,oI=new vr("auth","Firebase",iI());/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const $c=new Zo("@firebase/auth");function pc(r,...e){$c.logLevel<=Be.WARN&&$c.warn(`Auth (${Is}): ${r}`,...e)}function Cc(r,...e){$c.logLevel<=Be.ERROR&&$c.error(`Auth (${Is}): ${r}`,...e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Kt(r,...e){throw _f(r,...e)}function gn(r,...e){return _f(r,...e)}function mf(r,e,t){const n={...rP(),[e]:t};return new vr("auth","Firebase",n).create(e,{appName:r.name})}function bn(r){return mf(r,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function _f(r,...e){if(typeof r!="string"){const t=e[0],n=[...e.slice(1)];return n[0]&&(n[0].appName=r.name),r._errorFactory.create(t,...n)}return oI.create(r,...e)}function te(r,e,...t){if(!r)throw _f(e,...t)}function Tn(r){const e="INTERNAL ASSERTION FAILED: "+r;throw Cc(e),new Error(e)}function kn(r,e){r||Tn(e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function OB(){return typeof self<"u"&&self.location?.href||""}function sP(){return rg()==="http:"||rg()==="https:"}function rg(){return typeof self<"u"&&self.location?.protocol||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function iP(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(sP()||JB()||"connection"in navigator)?navigator.onLine:!0}function oP(){if(typeof navigator>"u")return null;const r=navigator;return r.languages&&r.languages[0]||r.language||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ga{constructor(e,t){this.shortDelay=e,this.longDelay=t,kn(t>e,"Short delay should be less than long delay!"),this.isMobile=Gy()||Hy()}get(){return iP()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ef(r,e){kn(r.emulator,"Emulator should always be set here");const{url:t}=r.emulator;return e?`${t}${e.startsWith("/")?e.slice(1):e}`:t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class aI{static initialize(e,t,n){this.fetchImpl=e,t&&(this.headersImpl=t),n&&(this.responseImpl=n)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self<"u"&&"fetch"in self)return self.fetch;if(typeof globalThis<"u"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch<"u")return fetch;Tn("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self<"u"&&"Headers"in self)return self.Headers;if(typeof globalThis<"u"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers<"u")return Headers;Tn("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self<"u"&&"Response"in self)return self.Response;if(typeof globalThis<"u"&&globalThis.Response)return globalThis.Response;if(typeof Response<"u")return Response;Tn("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const aP={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const cP=["/v1/accounts:signInWithCustomToken","/v1/accounts:signInWithEmailLink","/v1/accounts:signInWithIdp","/v1/accounts:signInWithPassword","/v1/accounts:signInWithPhoneNumber","/v1/token"],uP=new ga(3e4,6e4);function en(r,e){return r.tenantId&&!e.tenantId?{...e,tenantId:r.tenantId}:e}async function Jt(r,e,t,n,s={}){return cI(r,s,async()=>{let i={},o={};n&&(e==="GET"?o=n:i={body:JSON.stringify(n)});const a=Xo({...o,key:r.config.apiKey}).slice(1),c=await r._getAdditionalHeaders();c["Content-Type"]="application/json",r.languageCode&&(c["X-Firebase-Locale"]=r.languageCode);const l={method:e,headers:c,...i};return Uy()||(l.referrerPolicy="strict-origin-when-cross-origin"),r.emulatorConfig&&Vn(r.emulatorConfig.host)&&(l.credentials="include"),aI.fetch()(await uI(r,r.config.apiHost,t,a),l)})}async function cI(r,e,t){r._canInitEmulator=!1;const n={...aP,...e};try{const s=new BP(r),i=await Promise.race([t(),s.promise]);s.clearNetworkTimeout();const o=await i.json();if("needConfirmation"in o)throw Ya(r,"account-exists-with-different-credential",o);if(i.ok&&!("errorMessage"in o))return o;{const a=i.ok?o.errorMessage:o.error.message,[c,l]=a.split(" : ");if(c==="FEDERATED_USER_ID_ALREADY_LINKED")throw Ya(r,"credential-already-in-use",o);if(c==="EMAIL_EXISTS")throw Ya(r,"email-already-in-use",o);if(c==="USER_DISABLED")throw Ya(r,"user-disabled",o);const B=n[c]||c.toLowerCase().replace(/[_\s]+/g,"-");if(l)throw mf(r,B,l);Kt(r,B)}}catch(s){if(s instanceof xt)throw s;Kt(r,"network-request-failed",{message:String(s)})}}async function ma(r,e,t,n,s={}){const i=await Jt(r,e,t,n,s);return"mfaPendingCredential"in i&&Kt(r,"multi-factor-auth-required",{_serverResponse:i}),i}async function uI(r,e,t,n){const s=`${e}${t}?${n}`,i=r,o=i.config.emulator?Ef(r.config,s):`${r.config.apiScheme}://${s}`;return cP.includes(t)&&(await i._persistenceManagerAvailable,i._getPersistenceType()==="COOKIE")?i._getPersistence()._getFinalTarget(o).toString():o}function lP(r){switch(r){case"ENFORCE":return"ENFORCE";case"AUDIT":return"AUDIT";case"OFF":return"OFF";default:return"ENFORCEMENT_STATE_UNSPECIFIED"}}class BP{clearNetworkTimeout(){clearTimeout(this.timer)}constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((t,n)=>{this.timer=setTimeout(()=>n(gn(this.auth,"network-request-failed")),uP.get())})}}function Ya(r,e,t){const n={appName:r.name};t.email&&(n.email=t.email),t.phoneNumber&&(n.phoneNumber=t.phoneNumber);const s=gn(r,e,n);return s.customData._tokenResponse=t,s}function sg(r){return r!==void 0&&r.enterprise!==void 0}class hP{constructor(e){if(this.siteKey="",this.recaptchaEnforcementState=[],e.recaptchaKey===void 0)throw new Error("recaptchaKey undefined");this.siteKey=e.recaptchaKey.split("/")[3],this.recaptchaEnforcementState=e.recaptchaEnforcementState}getProviderEnforcementState(e){if(!this.recaptchaEnforcementState||this.recaptchaEnforcementState.length===0)return null;for(const t of this.recaptchaEnforcementState)if(t.provider&&t.provider===e)return lP(t.enforcementState);return null}isProviderEnabled(e){return this.getProviderEnforcementState(e)==="ENFORCE"||this.getProviderEnforcementState(e)==="AUDIT"}isAnyProviderEnabled(){return this.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")||this.isProviderEnabled("PHONE_PROVIDER")}}async function fP(r,e){return Jt(r,"GET","/v2/recaptchaConfig",en(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function dP(r,e){return Jt(r,"POST","/v1/accounts:delete",e)}async function Qc(r,e){return Jt(r,"POST","/v1/accounts:lookup",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function To(r){if(r)try{const e=new Date(Number(r));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}async function pP(r,e=!1){const t=ce(r),n=await t.getIdToken(e),s=If(n);te(s&&s.exp&&s.auth_time&&s.iat,t.auth,"internal-error");const i=typeof s.firebase=="object"?s.firebase:void 0,o=i?.sign_in_provider;return{claims:s,token:n,authTime:To(Fl(s.auth_time)),issuedAtTime:To(Fl(s.iat)),expirationTime:To(Fl(s.exp)),signInProvider:o||null,signInSecondFactor:i?.sign_in_second_factor||null}}function Fl(r){return Number(r)*1e3}function If(r){const[e,t,n]=r.split(".");if(e===void 0||t===void 0||n===void 0)return Cc("JWT malformed, contained fewer than 3 sections"),null;try{const s=sm(t);return s?JSON.parse(s):(Cc("Failed to decode base64 JWT payload"),null)}catch(s){return Cc("Caught error parsing JWT payload as JSON",s?.toString()),null}}function ig(r){const e=If(r);return te(e,"internal-error"),te(typeof e.exp<"u","internal-error"),te(typeof e.iat<"u","internal-error"),Number(e.exp)-Number(e.iat)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function gi(r,e,t=!1){if(t)return e;try{return await e}catch(n){throw n instanceof xt&&CP(n)&&r.auth.currentUser===r&&await r.auth.signOut(),n}}function CP({code:r}){return r==="auth/user-disabled"||r==="auth/user-token-expired"}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gP{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){if(e){const t=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),t}else{this.errorBackoff=3e4;const n=(this.user.stsTokenManager.expirationTime??0)-Date.now()-3e5;return Math.max(0,n)}}schedule(e=!1){if(!this.isRunning)return;const t=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},t)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){e?.code==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class FB{constructor(e,t){this.createdAt=e,this.lastLoginAt=t,this._initializeTime()}_initializeTime(){this.lastSignInTime=To(this.lastLoginAt),this.creationTime=To(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Wc(r){const e=r.auth,t=await r.getIdToken(),n=await gi(r,Qc(e,{idToken:t}));te(n?.users.length,e,"internal-error");const s=n.users[0];r._notifyReloadListener(s);const i=s.providerUserInfo?.length?lI(s.providerUserInfo):[],o=_P(r.providerData,i),a=r.isAnonymous,c=!(r.email&&s.passwordHash)&&!o?.length,l=a?c:!1,B={uid:s.localId,displayName:s.displayName||null,photoURL:s.photoUrl||null,email:s.email||null,emailVerified:s.emailVerified||!1,phoneNumber:s.phoneNumber||null,tenantId:s.tenantId||null,providerData:o,metadata:new FB(s.createdAt,s.lastLoginAt),isAnonymous:l};Object.assign(r,B)}async function mP(r){const e=ce(r);await Wc(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function _P(r,e){return[...r.filter(n=>!e.some(s=>s.providerId===n.providerId)),...e]}function lI(r){return r.map(({providerId:e,...t})=>({providerId:e,uid:t.rawId||"",displayName:t.displayName||null,email:t.email||null,phoneNumber:t.phoneNumber||null,photoURL:t.photoUrl||null}))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function EP(r,e){const t=await cI(r,{},async()=>{const n=Xo({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:s,apiKey:i}=r.config,o=await uI(r,s,"/v1/token",`key=${i}`),a=await r._getAdditionalHeaders();a["Content-Type"]="application/x-www-form-urlencoded";const c={method:"POST",headers:a,body:n};return r.emulatorConfig&&Vn(r.emulatorConfig.host)&&(c.credentials="include"),aI.fetch()(o,c)});return{accessToken:t.access_token,expiresIn:t.expires_in,refreshToken:t.refresh_token}}async function IP(r,e){return Jt(r,"POST","/v2/accounts:revokeToken",en(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $s{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){te(e.idToken,"internal-error"),te(typeof e.idToken<"u","internal-error"),te(typeof e.refreshToken<"u","internal-error");const t="expiresIn"in e&&typeof e.expiresIn<"u"?Number(e.expiresIn):ig(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,t)}updateFromIdToken(e){te(e.length!==0,"internal-error");const t=ig(e);this.updateTokensAndExpiration(e,null,t)}async getToken(e,t=!1){return!t&&this.accessToken&&!this.isExpired?this.accessToken:(te(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,t){const{accessToken:n,refreshToken:s,expiresIn:i}=await EP(e,t);this.updateTokensAndExpiration(n,s,Number(i))}updateTokensAndExpiration(e,t,n){this.refreshToken=t||null,this.accessToken=e||null,this.expirationTime=Date.now()+n*1e3}static fromJSON(e,t){const{refreshToken:n,accessToken:s,expirationTime:i}=t,o=new $s;return n&&(te(typeof n=="string","internal-error",{appName:e}),o.refreshToken=n),s&&(te(typeof s=="string","internal-error",{appName:e}),o.accessToken=s),i&&(te(typeof i=="number","internal-error",{appName:e}),o.expirationTime=i),o}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new $s,this.toJSON())}_performRefresh(){return Tn("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Zn(r,e){te(typeof r=="string"||typeof r>"u","internal-error",{appName:e})}class Wt{constructor({uid:e,auth:t,stsTokenManager:n,...s}){this.providerId="firebase",this.proactiveRefresh=new gP(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=e,this.auth=t,this.stsTokenManager=n,this.accessToken=n.accessToken,this.displayName=s.displayName||null,this.email=s.email||null,this.emailVerified=s.emailVerified||!1,this.phoneNumber=s.phoneNumber||null,this.photoURL=s.photoURL||null,this.isAnonymous=s.isAnonymous||!1,this.tenantId=s.tenantId||null,this.providerData=s.providerData?[...s.providerData]:[],this.metadata=new FB(s.createdAt||void 0,s.lastLoginAt||void 0)}async getIdToken(e){const t=await gi(this,this.stsTokenManager.getToken(this.auth,e));return te(t,this.auth,"internal-error"),this.accessToken!==t&&(this.accessToken=t,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),t}getIdTokenResult(e){return pP(this,e)}reload(){return mP(this)}_assign(e){this!==e&&(te(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(t=>({...t})),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const t=new Wt({...this,auth:e,stsTokenManager:this.stsTokenManager._clone()});return t.metadata._copy(this.metadata),t}_onReload(e){te(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,t=!1){let n=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),n=!0),t&&await Wc(this),await this.auth._persistUserIfCurrent(this),n&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(mt(this.auth.app))return Promise.reject(bn(this.auth));const e=await this.getIdToken();return await gi(this,dP(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return{uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>({...e})),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId,...this.metadata.toJSON(),apiKey:this.auth.config.apiKey,appName:this.auth.name}}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,t){const n=t.displayName??void 0,s=t.email??void 0,i=t.phoneNumber??void 0,o=t.photoURL??void 0,a=t.tenantId??void 0,c=t._redirectEventId??void 0,l=t.createdAt??void 0,B=t.lastLoginAt??void 0,{uid:f,emailVerified:p,isAnonymous:m,providerData:y,stsTokenManager:F}=t;te(f&&F,e,"internal-error");const V=$s.fromJSON(this.name,F);te(typeof f=="string",e,"internal-error"),Zn(n,e.name),Zn(s,e.name),te(typeof p=="boolean",e,"internal-error"),te(typeof m=="boolean",e,"internal-error"),Zn(i,e.name),Zn(o,e.name),Zn(a,e.name),Zn(c,e.name),Zn(l,e.name),Zn(B,e.name);const j=new Wt({uid:f,auth:e,email:s,emailVerified:p,displayName:n,isAnonymous:m,photoURL:o,phoneNumber:i,tenantId:a,stsTokenManager:V,createdAt:l,lastLoginAt:B});return y&&Array.isArray(y)&&(j.providerData=y.map(Y=>({...Y}))),c&&(j._redirectEventId=c),j}static async _fromIdTokenResponse(e,t,n=!1){const s=new $s;s.updateFromServerResponse(t);const i=new Wt({uid:t.localId,auth:e,stsTokenManager:s,isAnonymous:n});return await Wc(i),i}static async _fromGetAccountInfoResponse(e,t,n){const s=t.users[0];te(s.localId!==void 0,"internal-error");const i=s.providerUserInfo!==void 0?lI(s.providerUserInfo):[],o=!(s.email&&s.passwordHash)&&!i?.length,a=new $s;a.updateFromIdToken(n);const c=new Wt({uid:s.localId,auth:e,stsTokenManager:a,isAnonymous:o}),l={uid:s.localId,displayName:s.displayName||null,photoURL:s.photoUrl||null,email:s.email||null,emailVerified:s.emailVerified||!1,phoneNumber:s.phoneNumber||null,tenantId:s.tenantId||null,providerData:i,metadata:new FB(s.createdAt,s.lastLoginAt),isAnonymous:!(s.email&&s.passwordHash)&&!i?.length};return Object.assign(c,l),c}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const og=new Map;function wn(r){kn(r instanceof Function,"Expected a class definition");let e=og.get(r);return e?(kn(e instanceof r,"Instance stored in cache mismatched with class"),e):(e=new r,og.set(r,e),e)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class BI{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,t){this.storage[e]=t}async _get(e){const t=this.storage[e];return t===void 0?null:t}async _remove(e){delete this.storage[e]}_addListener(e,t){}_removeListener(e,t){}}BI.type="NONE";const ag=BI;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function gc(r,e,t){return`firebase:${r}:${e}:${t}`}class is{constructor(e,t,n){this.persistence=e,this.auth=t,this.userKey=n;const{config:s,name:i}=this.auth;this.fullUserKey=gc(this.userKey,s.apiKey,i),this.fullPersistenceKey=gc("persistence",s.apiKey,i),this.boundEventHandler=t._onStorageEvent.bind(t);try{this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}catch{}}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);if(!e)return null;if(typeof e=="string"){const t=await Qc(this.auth,{idToken:e}).catch(()=>{});return t?Wt._fromGetAccountInfoResponse(this.auth,t,e):null}return Wt._fromJSON(this.auth,e)}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const t=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,t)return this.setCurrentUser(t)}delete(){try{this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}catch{}}static async create(e,t,n="authUser"){if(!t.length)return new is(wn(ag),e,n);const s=(await Promise.all(t.map(async l=>{try{if(await l._isAvailable())return l}catch{return}}))).filter(l=>l);let i=s[0]||wn(ag);const o=gc(n,e.config.apiKey,e.name);let a=null;for(const l of t)try{const B=await l._get(o);if(B){let f;if(typeof B=="string"){const p=await Qc(e,{idToken:B}).catch(()=>{});if(!p)break;f=await Wt._fromGetAccountInfoResponse(e,p,B)}else f=Wt._fromJSON(e,B);l!==i&&(a=f),i=l;break}}catch{}const c=s.filter(l=>l._shouldAllowMigration);return!i._shouldAllowMigration||!c.length?new is(i,e,n):(i=c[0],a&&await i._set(o,a.toJSON()),await Promise.all(t.map(async l=>{if(l!==i)try{await l._remove(o)}catch{}})),new is(i,e,n))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function cg(r){const e=r.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(pI(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(hI(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(gI(e))return"Blackberry";if(mI(e))return"Webos";if(fI(e))return"Safari";if((e.includes("chrome/")||dI(e))&&!e.includes("edge/"))return"Chrome";if(CI(e))return"Android";{const t=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,n=r.match(t);if(n?.length===2)return n[1]}return"Other"}function hI(r=He()){return/firefox\//i.test(r)}function fI(r=He()){const e=r.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function dI(r=He()){return/crios\//i.test(r)}function pI(r=He()){return/iemobile/i.test(r)}function CI(r=He()){return/android/i.test(r)}function gI(r=He()){return/blackberry/i.test(r)}function mI(r=He()){return/webos/i.test(r)}function Df(r=He()){return/iphone|ipad|ipod/i.test(r)||/macintosh/i.test(r)&&/mobile/i.test(r)}function DP(r=He()){return Df(r)&&!!window.navigator?.standalone}function yP(){return qy()&&document.documentMode===10}function _I(r=He()){return Df(r)||CI(r)||mI(r)||gI(r)||/windows phone/i.test(r)||pI(r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function EI(r,e=[]){let t;switch(r){case"Browser":t=cg(He());break;case"Worker":t=`${cg(He())}-${r}`;break;default:t=r}const n=e.length?e.join(","):"FirebaseCore-web";return`${t}/JsCore/${Is}/${n}`}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class TP{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,t){const n=i=>new Promise((o,a)=>{try{const c=e(i);o(c)}catch(c){a(c)}});n.onAbort=t,this.queue.push(n);const s=this.queue.length-1;return()=>{this.queue[s]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const t=[];try{for(const n of this.queue)await n(e),n.onAbort&&t.push(n.onAbort)}catch(n){t.reverse();for(const s of t)try{s()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:n?.message})}}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function wP(r,e={}){return Jt(r,"GET","/v2/passwordPolicy",en(r,e))}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const AP=6;class vP{constructor(e){const t=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=t.minPasswordLength??AP,t.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=t.maxPasswordLength),t.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=t.containsLowercaseCharacter),t.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=t.containsUppercaseCharacter),t.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=t.containsNumericCharacter),t.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=t.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=e.allowedNonAlphanumericCharacters?.join("")??"",this.forceUpgradeOnSignin=e.forceUpgradeOnSignin??!1,this.schemaVersion=e.schemaVersion}validatePassword(e){const t={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,t),this.validatePasswordCharacterOptions(e,t),t.isValid&&(t.isValid=t.meetsMinPasswordLength??!0),t.isValid&&(t.isValid=t.meetsMaxPasswordLength??!0),t.isValid&&(t.isValid=t.containsLowercaseLetter??!0),t.isValid&&(t.isValid=t.containsUppercaseLetter??!0),t.isValid&&(t.isValid=t.containsNumericCharacter??!0),t.isValid&&(t.isValid=t.containsNonAlphanumericCharacter??!0),t}validatePasswordLengthOptions(e,t){const n=this.customStrengthOptions.minPasswordLength,s=this.customStrengthOptions.maxPasswordLength;n&&(t.meetsMinPasswordLength=e.length>=n),s&&(t.meetsMaxPasswordLength=e.length<=s)}validatePasswordCharacterOptions(e,t){this.updatePasswordCharacterOptionsStatuses(t,!1,!1,!1,!1);let n;for(let s=0;s<e.length;s++)n=e.charAt(s),this.updatePasswordCharacterOptionsStatuses(t,n>="a"&&n<="z",n>="A"&&n<="Z",n>="0"&&n<="9",this.allowedNonAlphanumericCharacters.includes(n))}updatePasswordCharacterOptionsStatuses(e,t,n,s,i){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=t)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=n)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=s)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=i))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class RP{constructor(e,t,n,s){this.app=e,this.heartbeatServiceProvider=t,this.appCheckServiceProvider=n,this.config=s,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new ug(this),this.idTokenSubscription=new ug(this),this.beforeStateQueue=new TP(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=oI,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this._resolvePersistenceManagerAvailable=void 0,this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=s.sdkClientVersion,this._persistenceManagerAvailable=new Promise(i=>this._resolvePersistenceManagerAvailable=i)}_initializeWithPersistence(e,t){return t&&(this._popupRedirectResolver=wn(t)),this._initializationPromise=this.queue(async()=>{if(!this._deleted){try{this.persistenceManager=await is.create(this,e)}catch(n){pc(`Failed to initialize persistence: ${n}`),this.persistenceManager=await is.create(this,[])}finally{this._resolvePersistenceManagerAvailable?.()}if(!this._deleted){if(this._popupRedirectResolver?._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}try{await this.initializeCurrentUser(t)}catch(n){pc(`Failed to initialize current user: ${n}`),await this.directlySetCurrentUser(null).catch(()=>{})}this.lastNotifiedUid=this.currentUser?.uid||null,!this._deleted&&(this._isInitialized=!0)}}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{const t=await Qc(this,{idToken:e}),n=await Wt._fromGetAccountInfoResponse(this,t,e);await this.directlySetCurrentUser(n)}catch(t){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",t),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){if(mt(this.app)){const i=this.app.settings.authIdToken;return i?new Promise(o=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(i).then(o,o))}):this.directlySetCurrentUser(null)}const t=await this.assertedPersistence.getCurrentUser();let n=t,s=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const i=this.redirectUser?._redirectEventId,o=n?._redirectEventId,a=await this.tryRedirectSignIn(e);(!i||i===o)&&a?.user&&(n=a.user,s=!0)}if(!n)return this.directlySetCurrentUser(null);if(!n._redirectEventId){if(s)try{await this.beforeStateQueue.runMiddleware(n)}catch(i){n=t,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(i))}return n?this.reloadAndSetCurrentUserOrClear(n):this.directlySetCurrentUser(null)}return te(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===n._redirectEventId?this.directlySetCurrentUser(n):this.reloadAndSetCurrentUserOrClear(n)}async tryRedirectSignIn(e){let t=null;try{t=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return t}async reloadAndSetCurrentUserOrClear(e){try{await Wc(e)}catch(t){if(t?.code!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=oP()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(mt(this.app))return Promise.reject(bn(this));const t=e?ce(e):null;return t&&te(t.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(t&&t._clone(this))}async _updateCurrentUser(e,t=!1){if(!this._deleted)return e&&te(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),t||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return mt(this.app)?Promise.reject(bn(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return mt(this.app)?Promise.reject(bn(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(wn(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const t=this._getPasswordPolicyInternal();return t.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):t.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await wP(this),t=new vP(e);this.tenantId===null?this._projectPasswordPolicy=t:this._tenantPasswordPolicies[this.tenantId]=t}_getPersistenceType(){return this.assertedPersistence.persistence.type}_getPersistence(){return this.assertedPersistence.persistence}_updateErrorMap(e){this._errorFactory=new vr("auth","Firebase",e())}onAuthStateChanged(e,t,n){return this.registerStateListener(this.authStateSubscription,e,t,n)}beforeAuthStateChanged(e,t){return this.beforeStateQueue.pushCallback(e,t)}onIdTokenChanged(e,t,n){return this.registerStateListener(this.idTokenSubscription,e,t,n)}authStateReady(){return new Promise((e,t)=>{if(this.currentUser)e();else{const n=this.onAuthStateChanged(()=>{n(),e()},t)}})}async revokeAccessToken(e){if(this.currentUser){const t=await this.currentUser.getIdToken(),n={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:t};this.tenantId!=null&&(n.tenantId=this.tenantId),await IP(this,n)}}toJSON(){return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:this._currentUser?.toJSON()}}async _setRedirectUser(e,t){const n=await this.getOrInitRedirectPersistenceManager(t);return e===null?n.removeCurrentUser():n.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const t=e&&wn(e)||this._popupRedirectResolver;te(t,this,"argument-error"),this.redirectPersistenceManager=await is.create(this,[wn(t._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){return this._isInitialized&&await this.queue(async()=>{}),this._currentUser?._redirectEventId===e?this._currentUser:this.redirectUser?._redirectEventId===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const e=this.currentUser?.uid??null;this.lastNotifiedUid!==e&&(this.lastNotifiedUid=e,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,t,n,s){if(this._deleted)return()=>{};const i=typeof t=="function"?t:t.next.bind(t);let o=!1;const a=this._isInitialized?Promise.resolve():this._initializationPromise;if(te(a,this,"internal-error"),a.then(()=>{o||i(this.currentUser)}).catch(c=>{if(!o)if(typeof t!="function"&&t.error)t.error(c);else if(n)n(c);else throw c}),typeof t=="function"){const c=e.addObserver(t,n,s);return()=>{o=!0,c()}}else{const c=e.addObserver(t);return()=>{o=!0,c()}}}async directlySetCurrentUser(e){if(this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,this.persistenceManager)try{e?await this.persistenceManager.setCurrentUser(e):await this.persistenceManager.removeCurrentUser()}catch(t){const n=t?.message||String(t),s=mf(this,"internal-error",`An internal AuthError has occurred: ${n}`);throw s.customData={originalError:t},s}}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return te(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=EI(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){const e={"X-Client-Version":this.clientVersion};this.app.options.appId&&(e["X-Firebase-gmpid"]=this.app.options.appId);const t=await this.heartbeatServiceProvider.getImmediate({optional:!0})?.getHeartbeatsHeader();t&&(e["X-Firebase-Client"]=t);const n=await this._getAppCheckToken();return n&&(e["X-Firebase-AppCheck"]=n),e}async _getAppCheckToken(){if(mt(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=await this.appCheckServiceProvider.getImmediate({optional:!0})?.getToken();return e?.error&&pc(`Error while retrieving App Check token: ${e.error}`),e?.token}}function Nr(r){return ce(r)}class ug{constructor(e){this.auth=e,this.observer=null,this.addObserver=zy(t=>this.observer=t)}get next(){return te(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let xu={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function bP(r){xu=r}function II(r){return xu.loadJS(r)}function SP(){return xu.recaptchaEnterpriseScript}function PP(){return xu.gapiScript}function NP(r){return`__${r}${Math.floor(Math.random()*1e6)}`}class OP{constructor(){this.enterprise=new FP}ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}class FP{ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const LP="recaptcha-enterprise",DI="NO_RECAPTCHA",lg="onFirebaseAuthREInstanceReady";class nr{constructor(e){this.type=LP,this.auth=Nr(e)}async verify(e="verify",t=!1){async function n(i){if(!t){if(i.tenantId==null&&i._agentRecaptchaConfig!=null)return i._agentRecaptchaConfig.siteKey;if(i.tenantId!=null&&i._tenantRecaptchaConfigs[i.tenantId]!==void 0)return i._tenantRecaptchaConfigs[i.tenantId].siteKey}return new Promise(async(o,a)=>{fP(i,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}).then(c=>{if(c.recaptchaKey===void 0)a(new Error("recaptcha Enterprise site key undefined"));else{const l=new hP(c);return i.tenantId==null?i._agentRecaptchaConfig=l:i._tenantRecaptchaConfigs[i.tenantId]=l,o(l.siteKey)}}).catch(c=>{a(c)})})}function s(i,o,a){const c=window.grecaptcha;sg(c)?c.enterprise.ready(()=>{c.enterprise.execute(i,{action:e}).then(l=>{o(l)}).catch(()=>{o(DI)})}):a(Error("No reCAPTCHA enterprise script loaded."))}return this.auth.settings.appVerificationDisabledForTesting?new OP().execute("siteKey",{action:"verify"}):new Promise((i,o)=>{n(this.auth).then(async a=>{if(!t&&sg(window.grecaptcha)&&nr.scriptInjectionDeferred)await nr.scriptInjectionDeferred.promise,s(a,i,o);else{if(typeof window>"u"){o(new Error("RecaptchaVerifier is only supported in browser"));return}let c=SP();c.length!==0&&(c+=a+`&onload=${lg}`),nr.scriptInjectionDeferred=new lm,window[lg]=()=>{nr.scriptInjectionDeferred?.resolve()},II(c).then(()=>nr.scriptInjectionDeferred?.promise).then(()=>{s(a,i,o)}).catch(l=>{o(l)})}}).catch(a=>{o(a)})})}}nr.scriptInjectionDeferred=null;async function Bg(r,e,t,n=!1,s=!1){const i=new nr(r);let o;if(s)o=DI;else try{o=await i.verify(t)}catch{o=await i.verify(t,!0)}const a={...e};if(t==="mfaSmsEnrollment"||t==="mfaSmsSignIn"){if("phoneEnrollmentInfo"in a){const c=a.phoneEnrollmentInfo.phoneNumber,l=a.phoneEnrollmentInfo.recaptchaToken;Object.assign(a,{phoneEnrollmentInfo:{phoneNumber:c,recaptchaToken:l,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}else if("phoneSignInInfo"in a){const c=a.phoneSignInInfo.recaptchaToken;Object.assign(a,{phoneSignInInfo:{recaptchaToken:c,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}return a}return n?Object.assign(a,{captchaResp:o}):Object.assign(a,{captchaResponse:o}),Object.assign(a,{clientType:"CLIENT_TYPE_WEB"}),Object.assign(a,{recaptchaVersion:"RECAPTCHA_ENTERPRISE"}),a}async function LB(r,e,t,n,s){if(r._getRecaptchaConfig()?.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")){const i=await Bg(r,e,t,t==="getOobCode");return n(r,i)}else return n(r,e).catch(async i=>{if(i.code==="auth/missing-recaptcha-token"){console.log(`${t} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`);const o=await Bg(r,e,t,t==="getOobCode");return n(r,o)}else return Promise.reject(i)})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function kP(r,e){const t=Zt(r,"auth");if(t.isInitialized()){const s=t.getImmediate(),i=t.getOptions();if(Cr(i,e??{}))return s;Kt(s,"already-initialized")}return t.initialize({options:e})}function xP(r,e){const t=e?.persistence||[],n=(Array.isArray(t)?t:[t]).map(wn);e?.errorMap&&r._updateErrorMap(e.errorMap),r._initializeWithPersistence(n,e?.popupRedirectResolver)}function VP(r,e,t){const n=Nr(r);te(/^https?:\/\//.test(e),n,"invalid-emulator-scheme");const s=!1,i=yI(e),{host:o,port:a}=MP(e),c=a===null?"":`:${a}`,l={url:`${i}//${o}${c}/`},B=Object.freeze({host:o,port:a,protocol:i.replace(":",""),options:Object.freeze({disableWarnings:s})});if(!n._canInitEmulator){te(n.config.emulator&&n.emulatorConfig,n,"emulator-config-failed"),te(Cr(l,n.config.emulator)&&Cr(B,n.emulatorConfig),n,"emulator-config-failed");return}n.config.emulator=l,n.emulatorConfig=B,n.settings.appVerificationDisabledForTesting=!0,Vn(o)?au(`${i}//${o}${c}`):GP()}function yI(r){const e=r.indexOf(":");return e<0?"":r.substr(0,e+1)}function MP(r){const e=yI(r),t=/(\/\/)?([^?#/]+)/.exec(r.substr(e.length));if(!t)return{host:"",port:null};const n=t[2].split("@").pop()||"",s=/^(\[[^\]]+\])(:|$)/.exec(n);if(s){const i=s[1];return{host:i,port:hg(n.substr(i.length+1))}}else{const[i,o]=n.split(":");return{host:i,port:hg(o)}}}function hg(r){if(!r)return null;const e=Number(r);return isNaN(e)?null:e}function GP(){function r(){const e=document.createElement("p"),t=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",t.position="fixed",t.width="100%",t.backgroundColor="#ffffff",t.border=".1em solid #000000",t.color="#b50000",t.bottom="0px",t.left="0px",t.margin="0px",t.zIndex="10000",t.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",r):r())}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yf{constructor(e,t){this.providerId=e,this.signInMethod=t}toJSON(){return Tn("not implemented")}_getIdTokenResponse(e){return Tn("not implemented")}_linkToIdToken(e,t){return Tn("not implemented")}_getReauthenticationResolver(e){return Tn("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function TI(r,e){return Jt(r,"POST","/v1/accounts:resetPassword",en(r,e))}async function UP(r,e){return Jt(r,"POST","/v1/accounts:signUp",e)}async function HP(r,e){return Jt(r,"POST","/v1/accounts:update",en(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function qP(r,e){return ma(r,"POST","/v1/accounts:signInWithPassword",en(r,e))}async function jP(r,e){return Jt(r,"POST","/v1/accounts:sendOobCode",en(r,e))}async function KP(r,e){return jP(r,e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function JP(r,e){return ma(r,"POST","/v1/accounts:signInWithEmailLink",en(r,e))}async function zP(r,e){return ma(r,"POST","/v1/accounts:signInWithEmailLink",en(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qo extends yf{constructor(e,t,n,s=null){super("password",n),this._email=e,this._password=t,this._tenantId=s}static _fromEmailAndPassword(e,t){return new Qo(e,t,"password")}static _fromEmailAndCode(e,t,n=null){return new Qo(e,t,"emailLink",n)}toJSON(){return{email:this._email,password:this._password,signInMethod:this.signInMethod,tenantId:this._tenantId}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e;if(t?.email&&t?.password){if(t.signInMethod==="password")return this._fromEmailAndPassword(t.email,t.password);if(t.signInMethod==="emailLink")return this._fromEmailAndCode(t.email,t.password,t.tenantId)}return null}async _getIdTokenResponse(e){switch(this.signInMethod){case"password":const t={returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return LB(e,t,"signInWithPassword",qP);case"emailLink":return JP(e,{email:this._email,oobCode:this._password});default:Kt(e,"internal-error")}}async _linkToIdToken(e,t){switch(this.signInMethod){case"password":const n={idToken:t,returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return LB(e,n,"signUpPassword",UP);case"emailLink":return zP(e,{idToken:t,email:this._email,oobCode:this._password});default:Kt(e,"internal-error")}}_getReauthenticationResolver(e){return this._getIdTokenResponse(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Qs(r,e){return ma(r,"POST","/v1/accounts:signInWithIdp",en(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const $P="http://localhost";class Cs extends yf{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const t=new Cs(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(t.idToken=e.idToken),e.accessToken&&(t.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(t.nonce=e.nonce),e.pendingToken&&(t.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(t.accessToken=e.oauthToken,t.secret=e.oauthTokenSecret):Kt("argument-error"),t}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e,{providerId:n,signInMethod:s,...i}=t;if(!n||!s)return null;const o=new Cs(n,s);return o.idToken=i.idToken||void 0,o.accessToken=i.accessToken||void 0,o.secret=i.secret,o.nonce=i.nonce,o.pendingToken=i.pendingToken||null,o}_getIdTokenResponse(e){const t=this.buildRequest();return Qs(e,t)}_linkToIdToken(e,t){const n=this.buildRequest();return n.idToken=t,Qs(e,n)}_getReauthenticationResolver(e){const t=this.buildRequest();return t.autoCreate=!1,Qs(e,t)}buildRequest(){const e={requestUri:$P,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const t={};this.idToken&&(t.id_token=this.idToken),this.accessToken&&(t.access_token=this.accessToken),this.secret&&(t.oauth_token_secret=this.secret),t.providerId=this.providerId,this.nonce&&!this.pendingToken&&(t.nonce=this.nonce),e.postBody=Xo(t)}return e}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function QP(r){switch(r){case"recoverEmail":return"RECOVER_EMAIL";case"resetPassword":return"PASSWORD_RESET";case"signIn":return"EMAIL_SIGNIN";case"verifyEmail":return"VERIFY_EMAIL";case"verifyAndChangeEmail":return"VERIFY_AND_CHANGE_EMAIL";case"revertSecondFactorAddition":return"REVERT_SECOND_FACTOR_ADDITION";default:return null}}function WP(r){const e=ro(so(r)).link,t=e?ro(so(e)).deep_link_id:null,n=ro(so(r)).deep_link_id;return(n?ro(so(n)).link:null)||n||t||e||r}class Tf{constructor(e){const t=ro(so(e)),n=t.apiKey??null,s=t.oobCode??null,i=QP(t.mode??null);te(n&&s&&i,"argument-error"),this.apiKey=n,this.operation=i,this.code=s,this.continueUrl=t.continueUrl??null,this.languageCode=t.lang??null,this.tenantId=t.tenantId??null}static parseLink(e){const t=WP(e);try{return new Tf(t)}catch{return null}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ni{constructor(){this.providerId=Ni.PROVIDER_ID}static credential(e,t){return Qo._fromEmailAndPassword(e,t)}static credentialWithLink(e,t){const n=Tf.parseLink(t);return te(n,"argument-error"),Qo._fromEmailAndCode(e,n.code,n.tenantId)}}Ni.PROVIDER_ID="password";Ni.EMAIL_PASSWORD_SIGN_IN_METHOD="password";Ni.EMAIL_LINK_SIGN_IN_METHOD="emailLink";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wI{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _a extends wI{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rr extends _a{constructor(){super("facebook.com")}static credential(e){return Cs._fromParams({providerId:rr.PROVIDER_ID,signInMethod:rr.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return rr.credentialFromTaggedObject(e)}static credentialFromError(e){return rr.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return rr.credential(e.oauthAccessToken)}catch{return null}}}rr.FACEBOOK_SIGN_IN_METHOD="facebook.com";rr.PROVIDER_ID="facebook.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sr extends _a{constructor(){super("google.com"),this.addScope("profile")}static credential(e,t){return Cs._fromParams({providerId:sr.PROVIDER_ID,signInMethod:sr.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:t})}static credentialFromResult(e){return sr.credentialFromTaggedObject(e)}static credentialFromError(e){return sr.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:n}=e;if(!t&&!n)return null;try{return sr.credential(t,n)}catch{return null}}}sr.GOOGLE_SIGN_IN_METHOD="google.com";sr.PROVIDER_ID="google.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ir extends _a{constructor(){super("github.com")}static credential(e){return Cs._fromParams({providerId:ir.PROVIDER_ID,signInMethod:ir.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return ir.credentialFromTaggedObject(e)}static credentialFromError(e){return ir.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return ir.credential(e.oauthAccessToken)}catch{return null}}}ir.GITHUB_SIGN_IN_METHOD="github.com";ir.PROVIDER_ID="github.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class or extends _a{constructor(){super("twitter.com")}static credential(e,t){return Cs._fromParams({providerId:or.PROVIDER_ID,signInMethod:or.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:t})}static credentialFromResult(e){return or.credentialFromTaggedObject(e)}static credentialFromError(e){return or.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthAccessToken:t,oauthTokenSecret:n}=e;if(!t||!n)return null;try{return or.credential(t,n)}catch{return null}}}or.TWITTER_SIGN_IN_METHOD="twitter.com";or.PROVIDER_ID="twitter.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function YP(r,e){return ma(r,"POST","/v1/accounts:signUp",en(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gs{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,t,n,s=!1){const i=await Wt._fromIdTokenResponse(e,n,s),o=fg(n);return new gs({user:i,providerId:o,_tokenResponse:n,operationType:t})}static async _forOperation(e,t,n){await e._updateTokensIfNecessary(n,!0);const s=fg(n);return new gs({user:e,providerId:s,_tokenResponse:n,operationType:t})}}function fg(r){return r.providerId?r.providerId:"phoneNumber"in r?"phone":null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Yc extends xt{constructor(e,t,n,s){super(t.code,t.message),this.operationType=n,this.user=s,Object.setPrototypeOf(this,Yc.prototype),this.customData={appName:e.name,tenantId:e.tenantId??void 0,_serverResponse:t.customData._serverResponse,operationType:n}}static _fromErrorAndOperation(e,t,n,s){return new Yc(e,t,n,s)}}function AI(r,e,t,n){return(e==="reauthenticate"?t._getReauthenticationResolver(r):t._getIdTokenResponse(r)).catch(i=>{throw i.code==="auth/multi-factor-auth-required"?Yc._fromErrorAndOperation(r,i,e,n):i})}async function XP(r,e,t=!1){const n=await gi(r,e._linkToIdToken(r.auth,await r.getIdToken()),t);return gs._forOperation(r,"link",n)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ZP(r,e,t=!1){const{auth:n}=r;if(mt(n.app))return Promise.reject(bn(n));const s="reauthenticate";try{const i=await gi(r,AI(n,s,e,r),t);te(i.idToken,n,"internal-error");const o=If(i.idToken);te(o,n,"internal-error");const{sub:a}=o;return te(r.uid===a,n,"user-mismatch"),gs._forOperation(r,s,i)}catch(i){throw i?.code==="auth/user-not-found"&&Kt(n,"user-mismatch"),i}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function vI(r,e,t=!1){if(mt(r.app))return Promise.reject(bn(r));const n="signIn",s=await AI(r,n,e),i=await gs._fromIdTokenResponse(r,n,s);return t||await r._updateCurrentUser(i.user),i}async function e0(r,e){return vI(Nr(r),e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wf{constructor(e,t){this.factorId=e,this.uid=t.mfaEnrollmentId,this.enrollmentTime=new Date(t.enrolledAt).toUTCString(),this.displayName=t.displayName}static _fromServerResponse(e,t){return"phoneInfo"in t?Af._fromServerResponse(e,t):"totpInfo"in t?vf._fromServerResponse(e,t):Kt(e,"internal-error")}}class Af extends wf{constructor(e){super("phone",e),this.phoneNumber=e.phoneInfo}static _fromServerResponse(e,t){return new Af(t)}}class vf extends wf{constructor(e){super("totp",e)}static _fromServerResponse(e,t){return new vf(t)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function t0(r,e,t){te(t.url?.length>0,r,"invalid-continue-uri"),te(typeof t.dynamicLinkDomain>"u"||t.dynamicLinkDomain.length>0,r,"invalid-dynamic-link-domain"),te(typeof t.linkDomain>"u"||t.linkDomain.length>0,r,"invalid-hosting-link-domain"),e.continueUrl=t.url,e.dynamicLinkDomain=t.dynamicLinkDomain,e.linkDomain=t.linkDomain,e.canHandleCodeInApp=t.handleCodeInApp,t.iOS&&(te(t.iOS.bundleId.length>0,r,"missing-ios-bundle-id"),e.iOSBundleId=t.iOS.bundleId),t.android&&(te(t.android.packageName.length>0,r,"missing-android-pkg-name"),e.androidInstallApp=t.android.installApp,e.androidMinimumVersionCode=t.android.minimumVersion,e.androidPackageName=t.android.packageName)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Rf(r){const e=Nr(r);e._getPasswordPolicyInternal()&&await e._updatePasswordPolicy()}async function Ex(r,e,t){await TI(ce(r),{oobCode:e,newPassword:t}).catch(async n=>{throw n.code==="auth/password-does-not-meet-requirements"&&Rf(r),n})}async function Ix(r,e){await HP(ce(r),{oobCode:e})}async function n0(r,e){const t=ce(r),n=await TI(t,{oobCode:e}),s=n.requestType;switch(te(s,t,"internal-error"),s){case"EMAIL_SIGNIN":break;case"VERIFY_AND_CHANGE_EMAIL":te(n.newEmail,t,"internal-error");break;case"REVERT_SECOND_FACTOR_ADDITION":te(n.mfaInfo,t,"internal-error");default:te(n.email,t,"internal-error")}let i=null;return n.mfaInfo&&(i=wf._fromServerResponse(Nr(t),n.mfaInfo)),{data:{email:(n.requestType==="VERIFY_AND_CHANGE_EMAIL"?n.newEmail:n.email)||null,previousEmail:(n.requestType==="VERIFY_AND_CHANGE_EMAIL"?n.email:n.newEmail)||null,multiFactorInfo:i},operation:s}}async function Dx(r,e){const{data:t}=await n0(ce(r),e);return t.email}async function yx(r,e,t){if(mt(r.app))return Promise.reject(bn(r));const n=Nr(r),o=await LB(n,{returnSecureToken:!0,email:e,password:t,clientType:"CLIENT_TYPE_WEB"},"signUpPassword",YP).catch(c=>{throw c.code==="auth/password-does-not-meet-requirements"&&Rf(r),c}),a=await gs._fromIdTokenResponse(n,"signIn",o);return await n._updateCurrentUser(a.user),a}function Tx(r,e,t){return mt(r.app)?Promise.reject(bn(r)):e0(ce(r),Ni.credential(e,t)).catch(async n=>{throw n.code==="auth/password-does-not-meet-requirements"&&Rf(r),n})}async function wx(r,e){const t=ce(r),s={requestType:"VERIFY_EMAIL",idToken:await r.getIdToken()};e&&t0(t.auth,s,e);const{email:i}=await KP(t.auth,s);i!==r.email&&await r.reload()}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function r0(r,e){return Jt(r,"POST","/v1/accounts:update",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Ax(r,e){const{displayName:t,photoURL:n}=e;if(t===void 0&&n===void 0)return;const s=ce(r),o={idToken:await s.getIdToken(),displayName:t,photoUrl:n,returnSecureToken:!0},a=await gi(s,r0(s.auth,o));s.displayName=a.displayName||null,s.photoURL=a.photoUrl||null;const c=s.providerData.find(({providerId:l})=>l==="password");c&&(c.displayName=s.displayName,c.photoURL=s.photoURL),await s._updateTokensIfNecessary(a)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function vx(r,e){return ce(r).setPersistence(e)}function s0(r,e,t,n){return ce(r).onIdTokenChanged(e,t,n)}function i0(r,e,t){return ce(r).beforeAuthStateChanged(e,t)}function Rx(r,e,t,n){return ce(r).onAuthStateChanged(e,t,n)}function bx(r){return ce(r).signOut()}const Xc="__sak";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class RI{constructor(e,t){this.storageRetriever=e,this.type=t}_isAvailable(){try{return this.storage?(this.storage.setItem(Xc,"1"),this.storage.removeItem(Xc),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,t){return this.storage.setItem(e,JSON.stringify(t)),Promise.resolve()}_get(e){const t=this.storage.getItem(e);return Promise.resolve(t?JSON.parse(t):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const o0=1e3,a0=10;class bI extends RI{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,t)=>this.onStorageEvent(e,t),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=_I(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const t of Object.keys(this.listeners)){const n=this.storage.getItem(t),s=this.localCache[t];n!==s&&e(t,s,n)}}onStorageEvent(e,t=!1){if(!e.key){this.forAllChangedKeys((o,a,c)=>{this.notifyListeners(o,c)});return}const n=e.key;t?this.detachListener():this.stopPolling();const s=()=>{const o=this.storage.getItem(n);!t&&this.localCache[n]===o||this.notifyListeners(n,o)},i=this.storage.getItem(n);yP()&&i!==e.newValue&&e.newValue!==e.oldValue?setTimeout(s,a0):s()}notifyListeners(e,t){this.localCache[e]=t;const n=this.listeners[e];if(n)for(const s of Array.from(n))s(t&&JSON.parse(t))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,t,n)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:t,newValue:n}),!0)})},o0)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,t){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,t){await super._set(e,t),this.localCache[e]=JSON.stringify(t)}async _get(e){const t=await super._get(e);return this.localCache[e]=JSON.stringify(t),t}async _remove(e){await super._remove(e),delete this.localCache[e]}}bI.type="LOCAL";const c0=bI;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class SI extends RI{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,t){}_removeListener(e,t){}}SI.type="SESSION";const PI=SI;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function u0(r){return Promise.all(r.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(t){return{fulfilled:!1,reason:t}}}))}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Vu{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const t=this.receivers.find(s=>s.isListeningto(e));if(t)return t;const n=new Vu(e);return this.receivers.push(n),n}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const t=e,{eventId:n,eventType:s,data:i}=t.data,o=this.handlersMap[s];if(!o?.size)return;t.ports[0].postMessage({status:"ack",eventId:n,eventType:s});const a=Array.from(o).map(async l=>l(t.origin,i)),c=await u0(a);t.ports[0].postMessage({status:"done",eventId:n,eventType:s,response:c})}_subscribe(e,t){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(t)}_unsubscribe(e,t){this.handlersMap[e]&&t&&this.handlersMap[e].delete(t),(!t||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}Vu.receivers=[];/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function bf(r="",e=10){let t="";for(let n=0;n<e;n++)t+=Math.floor(Math.random()*10);return r+t}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class l0{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,t,n=50){const s=typeof MessageChannel<"u"?new MessageChannel:null;if(!s)throw new Error("connection_unavailable");let i,o;return new Promise((a,c)=>{const l=bf("",20);s.port1.start();const B=setTimeout(()=>{c(new Error("unsupported_event"))},n);o={messageChannel:s,onMessage(f){const p=f;if(p.data.eventId===l)switch(p.data.status){case"ack":clearTimeout(B),i=setTimeout(()=>{c(new Error("timeout"))},3e3);break;case"done":clearTimeout(i),a(p.data.response);break;default:clearTimeout(B),clearTimeout(i),c(new Error("invalid_response"));break}}},this.handlers.add(o),s.port1.addEventListener("message",o.onMessage),this.target.postMessage({eventType:e,eventId:l,data:t},[s.port2])}).finally(()=>{o&&this.removeMessageHandler(o)})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function mn(){return window}function B0(r){mn().location.href=r}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function NI(){return typeof mn().WorkerGlobalScope<"u"&&typeof mn().importScripts=="function"}async function h0(){if(!navigator?.serviceWorker)return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function f0(){return navigator?.serviceWorker?.controller||null}function d0(){return NI()?self:null}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const OI="firebaseLocalStorageDb",p0=1,Zc="firebaseLocalStorage",FI="fbase_key";class Ea{constructor(e){this.request=e}toPromise(){return new Promise((e,t)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{t(this.request.error)})})}}function Mu(r,e){return r.transaction([Zc],e?"readwrite":"readonly").objectStore(Zc)}function C0(){const r=indexedDB.deleteDatabase(OI);return new Ea(r).toPromise()}function LI(){const r=indexedDB.open(OI,p0);return new Promise((e,t)=>{r.addEventListener("error",()=>{t(r.error)}),r.addEventListener("upgradeneeded",()=>{const n=r.result;try{n.createObjectStore(Zc,{keyPath:FI})}catch(s){t(s)}}),r.addEventListener("success",async()=>{const n=r.result;n.objectStoreNames.contains(Zc)?e(n):(n.close(),await C0(),e(await LI()))})})}async function dg(r,e,t){const n=Mu(r,!0).put({[FI]:e,value:t});return new Ea(n).toPromise()}async function g0(r,e){const t=Mu(r,!1).get(e),n=await new Ea(t).toPromise();return n===void 0?null:n.value}function pg(r,e){const t=Mu(r,!0).delete(e);return new Ea(t).toPromise()}const m0=800,_0=3;class kI{registerLifecycleListeners(){typeof window<"u"&&typeof window.addEventListener=="function"&&(window.addEventListener("pagehide",this.onPageHide),window.addEventListener("pageshow",this.onPageShow))}unregisterLifecycleListeners(){typeof window<"u"&&typeof window.removeEventListener=="function"&&(window.removeEventListener("pagehide",this.onPageHide),window.removeEventListener("pageshow",this.onPageShow))}constructor(){this.type="LOCAL",this.dbPromise=null,this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.isClosing=!1,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this.onPageHide=()=>{this.isClosing=!0,this.stopPolling(),this.dbPromise&&(this.dbPromise.then(e=>e.close()).catch(()=>{}),this.dbPromise=null)},this.onPageShow=()=>{this.isClosing&&(this.isClosing=!1,Object.keys(this.listeners).length>0&&this.startPolling())},this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.dbPromise?this.dbPromise:(this.dbPromise=LI(),this.dbPromise.catch(()=>{this.dbPromise=null}),this.dbPromise)}async _withRetries(e){let t=0;for(;;)try{const n=await this._openDb();return await e(n)}catch(n){if(t++>_0)throw n;if(this.dbPromise){const s=this.dbPromise;this.dbPromise=null;try{(await s).close()}catch{}}}}async initializeServiceWorkerMessaging(){return NI()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=Vu._getInstance(d0()),this.receiver._subscribe("keyChanged",async(e,t)=>({keyProcessed:(await this._poll()).includes(t.key)})),this.receiver._subscribe("ping",async(e,t)=>["keyChanged"])}async initializeSender(){if(this.activeServiceWorker=await h0(),!this.activeServiceWorker)return;this.sender=new l0(this.activeServiceWorker);const e=await this.sender._send("ping",{},800);e&&e[0]?.fulfilled&&e[0]?.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||f0()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{return indexedDB?(await this._withRetries(async e=>{await dg(e,Xc,"1"),await pg(e,Xc)}),!0):!1}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,t){return this._withPendingWrite(async()=>(await this._withRetries(n=>dg(n,e,t)),this.localCache[e]=t,this.notifyServiceWorker(e)))}async _get(e){const t=await this._withRetries(n=>g0(n,e));return this.localCache[e]=t,t}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(t=>pg(t,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){if(this.isClosing)return[];try{const e=await this._withRetries(s=>{const i=Mu(s,!1).getAll();return new Ea(i).toPromise()});if(this.isClosing)return[];if(!e)return[];if(this.pendingWrites!==0)return[];const t=[],n=new Set;if(e.length!==0)for(const{fbase_key:s,value:i}of e)n.add(s),JSON.stringify(this.localCache[s])!==JSON.stringify(i)&&(this.notifyListeners(s,i),t.push(s));for(const s of Object.keys(this.localCache))this.localCache[s]&&!n.has(s)&&(this.notifyListeners(s,null),t.push(s));return t}catch(e){return this.isClosing||pc(`Firebase Auth cross-tab polling failed with error: ${e}`),[]}}notifyListeners(e,t){this.localCache[e]=t;const n=this.listeners[e];if(n)for(const s of Array.from(n))s(t)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),m0)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,t){Object.keys(this.listeners).length===0&&(this.startPolling(),this.registerLifecycleListeners()),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.stopPolling(),this.unregisterLifecycleListeners())}}kI.type="LOCAL";const E0=kI;new ga(3e4,6e4);/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function I0(r,e){return e?wn(e):(te(r._popupRedirectResolver,r,"argument-error"),r._popupRedirectResolver)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Sf extends yf{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return Qs(e,this._buildIdpRequest())}_linkToIdToken(e,t){return Qs(e,this._buildIdpRequest(t))}_getReauthenticationResolver(e){return Qs(e,this._buildIdpRequest())}_buildIdpRequest(e){const t={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(t.idToken=e),t}}function D0(r){return vI(r.auth,new Sf(r),r.bypassAuthState)}function y0(r){const{auth:e,user:t}=r;return te(t,e,"internal-error"),ZP(t,new Sf(r),r.bypassAuthState)}async function T0(r){const{auth:e,user:t}=r;return te(t,e,"internal-error"),XP(t,new Sf(r),r.bypassAuthState)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xI{constructor(e,t,n,s,i=!1){this.auth=e,this.resolver=n,this.user=s,this.bypassAuthState=i,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(t)?t:[t]}execute(){return new Promise(async(e,t)=>{this.pendingPromise={resolve:e,reject:t};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(n){this.reject(n)}})}async onAuthEvent(e){const{urlResponse:t,sessionId:n,postBody:s,tenantId:i,error:o,type:a}=e;if(o){this.reject(o);return}const c={auth:this.auth,requestUri:t,sessionId:n,tenantId:i||void 0,postBody:s||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(a)(c))}catch(l){this.reject(l)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return D0;case"linkViaPopup":case"linkViaRedirect":return T0;case"reauthViaPopup":case"reauthViaRedirect":return y0;default:Kt(this.auth,"internal-error")}}resolve(e){kn(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){kn(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const w0=new ga(2e3,1e4);class Ks extends xI{constructor(e,t,n,s,i){super(e,t,s,i),this.provider=n,this.authWindow=null,this.pollId=null,Ks.currentPopupAction&&Ks.currentPopupAction.cancel(),Ks.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return te(e,this.auth,"internal-error"),e}async onExecution(){kn(this.filter.length===1,"Popup operations only handle one event");const e=bf();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(t=>{this.reject(t)}),this.resolver._isIframeWebStorageSupported(this.auth,t=>{t||this.reject(gn(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){return this.authWindow?.associatedEvent||null}cancel(){this.reject(gn(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,Ks.currentPopupAction=null}pollUserCancellation(){const e=()=>{if(this.authWindow?.window?.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(gn(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,w0.get())};e()}}Ks.currentPopupAction=null;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const A0="pendingRedirect",mc=new Map;class v0 extends xI{constructor(e,t,n=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],t,void 0,n),this.eventId=null}async execute(){let e=mc.get(this.auth._key());if(!e){try{const n=await R0(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(n)}catch(t){e=()=>Promise.reject(t)}mc.set(this.auth._key(),e)}return this.bypassAuthState||mc.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){const t=await this.auth._redirectUserForId(e.eventId);if(t)return this.user=t,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}}async function R0(r,e){const t=P0(e),n=S0(r);if(!await n._isAvailable())return!1;const s=await n._get(t)==="true";return await n._remove(t),s}function b0(r,e){mc.set(r._key(),e)}function S0(r){return wn(r._redirectPersistence)}function P0(r){return gc(A0,r.config.apiKey,r.name)}async function N0(r,e,t=!1){if(mt(r.app))return Promise.reject(bn(r));const n=Nr(r),s=I0(n,e),o=await new v0(n,s,t).execute();return o&&!t&&(delete o.user._redirectEventId,await n._persistUserIfCurrent(o.user),await n._setRedirectUser(null,e)),o}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const O0=600*1e3;class F0{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let t=!1;return this.consumers.forEach(n=>{this.isEventForConsumer(e,n)&&(t=!0,this.sendToConsumer(e,n),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!L0(e)||(this.hasHandledPotentialRedirect=!0,t||(this.queuedRedirectEvent=e,t=!0)),t}sendToConsumer(e,t){if(e.error&&!VI(e)){const n=e.error.code?.split("auth/")[1]||"internal-error";t.onError(gn(this.auth,n))}else t.onAuthEvent(e)}isEventForConsumer(e,t){const n=t.eventId===null||!!e.eventId&&e.eventId===t.eventId;return t.filter.includes(e.type)&&n}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=O0&&this.cachedEventUids.clear(),this.cachedEventUids.has(Cg(e))}saveEventToCache(e){this.cachedEventUids.add(Cg(e)),this.lastProcessedEventTime=Date.now()}}function Cg(r){return[r.type,r.eventId,r.sessionId,r.tenantId].filter(e=>e).join("-")}function VI({type:r,error:e}){return r==="unknown"&&e?.code==="auth/no-auth-event"}function L0(r){switch(r.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return VI(r);default:return!1}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function k0(r,e={}){return Jt(r,"GET","/v1/projects",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const x0=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,V0=/^https?/;async function M0(r){if(r.config.emulator)return;const{authorizedDomains:e}=await k0(r);for(const t of e)try{if(G0(t))return}catch{}Kt(r,"unauthorized-domain")}function G0(r){const e=OB(),{protocol:t,hostname:n}=new URL(e);if(r.startsWith("chrome-extension://")){const o=new URL(r);return o.hostname===""&&n===""?t==="chrome-extension:"&&r.replace("chrome-extension://","")===e.replace("chrome-extension://",""):t==="chrome-extension:"&&o.hostname===n}if(!V0.test(t))return!1;if(x0.test(r))return n===r;const s=r.replace(/\./g,"\\.");return new RegExp("^(.+\\."+s+"|"+s+")$","i").test(n)}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const U0=new ga(3e4,6e4);function gg(){const r=mn().___jsl;if(r?.H){for(const e of Object.keys(r.H))if(r.H[e].r=r.H[e].r||[],r.H[e].L=r.H[e].L||[],r.H[e].r=[...r.H[e].L],r.CP)for(let t=0;t<r.CP.length;t++)r.CP[t]=null}}function H0(r){return new Promise((e,t)=>{function n(){gg(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{gg(),t(gn(r,"network-request-failed"))},timeout:U0.get()})}if(mn().gapi?.iframes?.Iframe)e(gapi.iframes.getContext());else if(mn().gapi?.load)n();else{const s=NP("iframefcb");return mn()[s]=()=>{gapi.load?n():t(gn(r,"network-request-failed"))},II(`${PP()}?onload=${s}`).catch(i=>t(i))}}).catch(e=>{throw _c=null,e})}let _c=null;function q0(r){return _c=_c||H0(r),_c}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const j0=new ga(5e3,15e3),K0="__/auth/iframe",J0="emulator/auth/iframe",z0={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},$0=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function Q0(r){const e=r.config;te(e.authDomain,r,"auth-domain-config-required");const t=e.emulator?Ef(e,J0):`https://${r.config.authDomain}/${K0}`,n={apiKey:e.apiKey,appName:r.name,v:Is},s=$0.get(r.config.apiHost);s&&(n.eid=s);const i=r._getFrameworks();return i.length&&(n.fw=i.join(",")),`${t}?${Xo(n).slice(1)}`}async function W0(r){const e=await q0(r),t=mn().gapi;return te(t,r,"internal-error"),e.open({where:document.body,url:Q0(r),messageHandlersFilter:t.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:z0,dontclear:!0},n=>new Promise(async(s,i)=>{await n.restyle({setHideOnLeave:!1});const o=gn(r,"network-request-failed"),a=mn().setTimeout(()=>{i(o)},j0.get());function c(){mn().clearTimeout(a),s(n)}n.ping(c).then(c,()=>{i(o)})}))}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Y0={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},X0=500,Z0=600,eN="_blank",tN="http://localhost";class mg{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}}function nN(r,e,t,n=X0,s=Z0){const i=Math.max((window.screen.availHeight-s)/2,0).toString(),o=Math.max((window.screen.availWidth-n)/2,0).toString();let a="";const c={...Y0,width:n.toString(),height:s.toString(),top:i,left:o},l=He().toLowerCase();t&&(a=dI(l)?eN:t),hI(l)&&(e=e||tN,c.scrollbars="yes");const B=Object.entries(c).reduce((p,[m,y])=>`${p}${m}=${y},`,"");if(DP(l)&&a!=="_self")return rN(e||"",a),new mg(null);const f=window.open(e||"",a,B);te(f,r,"popup-blocked");try{f.focus()}catch{}return new mg(f)}function rN(r,e){const t=document.createElement("a");t.href=r,t.target=e;const n=document.createEvent("MouseEvent");n.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),t.dispatchEvent(n)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const sN="__/auth/handler",iN="emulator/auth/handler",oN=encodeURIComponent("fac");async function _g(r,e,t,n,s,i){te(r.config.authDomain,r,"auth-domain-config-required"),te(r.config.apiKey,r,"invalid-api-key");const o={apiKey:r.config.apiKey,appName:r.name,authType:t,redirectUrl:n,v:Is,eventId:s};if(e instanceof wI){e.setDefaultLanguage(r.languageCode),o.providerId=e.providerId||"",Jy(e.getCustomParameters())||(o.customParameters=JSON.stringify(e.getCustomParameters()));for(const[B,f]of Object.entries({}))o[B]=f}if(e instanceof _a){const B=e.getScopes().filter(f=>f!=="");B.length>0&&(o.scopes=B.join(","))}r.tenantId&&(o.tid=r.tenantId);const a=o;for(const B of Object.keys(a))a[B]===void 0&&delete a[B];const c=await r._getAppCheckToken(),l=c?`#${oN}=${encodeURIComponent(c)}`:"";return`${aN(r)}?${Xo(a).slice(1)}${l}`}function aN({config:r}){return r.emulator?Ef(r,iN):`https://${r.authDomain}/${sN}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ll="webStorageSupport";class cN{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=PI,this._completeRedirectFn=N0,this._overrideRedirectResult=b0}async _openPopup(e,t,n,s){kn(this.eventManagers[e._key()]?.manager,"_initialize() not called before _openPopup()");const i=await _g(e,t,n,OB(),s);return nN(e,i,bf())}async _openRedirect(e,t,n,s){await this._originValidation(e);const i=await _g(e,t,n,OB(),s);return B0(i),new Promise(()=>{})}_initialize(e){const t=e._key();if(this.eventManagers[t]){const{manager:s,promise:i}=this.eventManagers[t];return s?Promise.resolve(s):(kn(i,"If manager is not set, promise should be"),i)}const n=this.initAndGetManager(e);return this.eventManagers[t]={promise:n},n.catch(()=>{delete this.eventManagers[t]}),n}async initAndGetManager(e){const t=await W0(e),n=new F0(e);return t.register("authEvent",s=>(te(s?.authEvent,e,"invalid-auth-event"),{status:n.onEvent(s.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:n},this.iframes[e._key()]=t,n}_isIframeWebStorageSupported(e,t){this.iframes[e._key()].send(Ll,{type:Ll},s=>{const i=s?.[0]?.[Ll];i!==void 0&&t(!!i),Kt(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const t=e._key();return this.originValidationPromises[t]||(this.originValidationPromises[t]=M0(e)),this.originValidationPromises[t]}get _shouldInitProactively(){return _I()||fI()||Df()}}const uN=cN;var Eg="@firebase/auth",Ig="1.13.6";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lN{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){return this.assertAuthConfigured(),this.auth.currentUser?.uid||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const t=this.auth.onIdTokenChanged(n=>{e(n?.stsTokenManager.accessToken||null)});this.internalListeners.set(e,t),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const t=this.internalListeners.get(e);t&&(this.internalListeners.delete(e),t(),this.updateProactiveRefresh())}assertAuthConfigured(){te(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function BN(r){switch(r){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function hN(r){Lt(new Dt("auth",(e,{options:t})=>{const n=e.getProvider("app").getImmediate(),s=e.getProvider("heartbeat"),i=e.getProvider("app-check-internal"),{apiKey:o,authDomain:a}=n.options;te(o&&!o.includes(":"),"invalid-api-key",{appName:n.name});const c={apiKey:o,authDomain:a,clientPlatform:r,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:EI(r)},l=new RP(n,s,i,c);return xP(l,t),l},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,t,n)=>{e.getProvider("auth-internal").initialize()})),Lt(new Dt("auth-internal",e=>{const t=Nr(e.getProvider("auth").getImmediate());return(n=>new lN(n))(t)},"PRIVATE").setInstantiationMode("EXPLICIT")),Qe(Eg,Ig,BN(r)),Qe(Eg,Ig,"esm2020")}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const fN=300,dN=um("authIdTokenMaxAge")||fN;let Dg=null;const pN=r=>async e=>{const t=e&&await e.getIdTokenResult(),n=t&&(new Date().getTime()-Date.parse(t.issuedAtTime))/1e3;if(n&&n>dN)return;const s=t?.token;Dg!==s&&(Dg=s,await fetch(r,{method:s?"POST":"DELETE",headers:s?{Authorization:`Bearer ${s}`}:{}}))};function Sx(r=ea()){const e=Zt(r,"auth");if(e.isInitialized())return e.getImmediate();const t=kP(r,{popupRedirectResolver:uN,persistence:[E0,c0,PI]}),n=um("authTokenSyncURL");if(n&&typeof isSecureContext=="boolean"&&isSecureContext){const i=new URL(n,location.origin);if(location.origin===i.origin){const o=pN(i.toString());i0(t,o,()=>o(t.currentUser)),s0(t,a=>o(a))}}const s=om("auth");return s&&VP(t,`http://${s}`),t}function CN(){return document.getElementsByTagName("head")?.[0]??document}bP({loadJS(r){return new Promise((e,t)=>{const n=document.createElement("script");n.setAttribute("src",r),n.onload=e,n.onerror=s=>{const i=gn("internal-error");i.customData=s,t(i)},n.type="text/javascript",n.charset="UTF-8",CN().appendChild(n)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});hN("Browser");/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const MI="firebasestorage.googleapis.com",GI="storageBucket",gN=120*1e3,mN=600*1e3;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Oe extends xt{constructor(e,t,n=0){super(kl(e),`Firebase Storage: ${t} (${kl(e)})`),this.status_=n,this.customData={serverResponse:null},this._baseMessage=this.message,Object.setPrototypeOf(this,Oe.prototype)}get status(){return this.status_}set status(e){this.status_=e}_codeEquals(e){return kl(e)===this.code}get serverResponse(){return this.customData.serverResponse}set serverResponse(e){this.customData.serverResponse=e,this.customData.serverResponse?this.message=`${this._baseMessage}
${this.customData.serverResponse}`:this.message=this._baseMessage}}var Ne;(function(r){r.UNKNOWN="unknown",r.OBJECT_NOT_FOUND="object-not-found",r.BUCKET_NOT_FOUND="bucket-not-found",r.PROJECT_NOT_FOUND="project-not-found",r.QUOTA_EXCEEDED="quota-exceeded",r.UNAUTHENTICATED="unauthenticated",r.UNAUTHORIZED="unauthorized",r.UNAUTHORIZED_APP="unauthorized-app",r.RETRY_LIMIT_EXCEEDED="retry-limit-exceeded",r.INVALID_CHECKSUM="invalid-checksum",r.CANCELED="canceled",r.INVALID_EVENT_NAME="invalid-event-name",r.INVALID_URL="invalid-url",r.INVALID_DEFAULT_BUCKET="invalid-default-bucket",r.NO_DEFAULT_BUCKET="no-default-bucket",r.CANNOT_SLICE_BLOB="cannot-slice-blob",r.SERVER_FILE_WRONG_SIZE="server-file-wrong-size",r.NO_DOWNLOAD_URL="no-download-url",r.INVALID_ARGUMENT="invalid-argument",r.INVALID_ARGUMENT_COUNT="invalid-argument-count",r.APP_DELETED="app-deleted",r.INVALID_ROOT_OPERATION="invalid-root-operation",r.INVALID_FORMAT="invalid-format",r.INTERNAL_ERROR="internal-error",r.UNSUPPORTED_ENVIRONMENT="unsupported-environment"})(Ne||(Ne={}));function kl(r){return"storage/"+r}function Pf(){const r="An unknown error occurred, please check the error payload for server response.";return new Oe(Ne.UNKNOWN,r)}function _N(r){return new Oe(Ne.OBJECT_NOT_FOUND,"Object '"+r+"' does not exist.")}function EN(r){return new Oe(Ne.QUOTA_EXCEEDED,"Quota for bucket '"+r+"' exceeded, please view quota on https://firebase.google.com/pricing/.")}function IN(){const r="User is not authenticated, please authenticate using Firebase Authentication and try again.";return new Oe(Ne.UNAUTHENTICATED,r)}function DN(){return new Oe(Ne.UNAUTHORIZED_APP,"This app does not have permission to access Firebase Storage on this project.")}function yN(r){return new Oe(Ne.UNAUTHORIZED,"User does not have permission to access '"+r+"'.")}function TN(){return new Oe(Ne.RETRY_LIMIT_EXCEEDED,"Max retry time for operation exceeded, please try again.")}function wN(){return new Oe(Ne.CANCELED,"User canceled the upload/download.")}function AN(r){return new Oe(Ne.INVALID_URL,"Invalid URL '"+r+"'.")}function vN(r){return new Oe(Ne.INVALID_DEFAULT_BUCKET,"Invalid default bucket '"+r+"'.")}function RN(){return new Oe(Ne.NO_DEFAULT_BUCKET,"No default bucket found. Did you set the '"+GI+"' property when initializing the app?")}function bN(){return new Oe(Ne.CANNOT_SLICE_BLOB,"Cannot slice blob for upload. Please retry the upload.")}function SN(){return new Oe(Ne.NO_DOWNLOAD_URL,"The given file does not have any download URLs.")}function PN(r){return new Oe(Ne.UNSUPPORTED_ENVIRONMENT,`${r} is missing. Make sure to install the required polyfills. See https://firebase.google.com/docs/web/environments-js-sdk#polyfills for more information.`)}function kB(r){return new Oe(Ne.INVALID_ARGUMENT,r)}function UI(){return new Oe(Ne.APP_DELETED,"The Firebase app was deleted.")}function NN(r){return new Oe(Ne.INVALID_ROOT_OPERATION,"The operation '"+r+"' cannot be performed on a root reference, create a non-root reference using child, such as .child('file.png').")}function wo(r,e){return new Oe(Ne.INVALID_FORMAT,"String does not match format '"+r+"': "+e)}function no(r){throw new Oe(Ne.INTERNAL_ERROR,"Internal error: "+r)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Nt{constructor(e,t){this.bucket=e,this.path_=t}get path(){return this.path_}get isRoot(){return this.path.length===0}fullServerUrl(){const e=encodeURIComponent;return"/b/"+e(this.bucket)+"/o/"+e(this.path)}bucketOnlyServerUrl(){return"/b/"+encodeURIComponent(this.bucket)+"/o"}static makeFromBucketSpec(e,t){let n;try{n=Nt.makeFromUrl(e,t)}catch{return new Nt(e,"")}if(n.path==="")return n;throw vN(e)}static makeFromUrl(e,t){let n=null;const s="([A-Za-z0-9.\\-_]+)";function i(se){se.path.charAt(se.path.length-1)==="/"&&(se.path_=se.path_.slice(0,-1))}const o="(/(.*))?$",a=new RegExp("^gs://"+s+o,"i"),c={bucket:1,path:3};function l(se){se.path_=decodeURIComponent(se.path)}const B="v[A-Za-z0-9_]+",f=t.replace(/[.]/g,"\\."),p="(/([^?#]*).*)?$",m=new RegExp(`^https?://${f}/${B}/b/${s}/o${p}`,"i"),y={bucket:1,path:3},F=t===MI?"(?:storage.googleapis.com|storage.cloud.google.com)":t,V="([^?#]*)",j=new RegExp(`^https?://${F}/${s}/${V}`,"i"),ee=[{regex:a,indices:c,postModify:i},{regex:m,indices:y,postModify:l},{regex:j,indices:{bucket:1,path:2},postModify:l}];for(let se=0;se<ee.length;se++){const fe=ee[se],oe=fe.regex.exec(e);if(oe){const T=oe[fe.indices.bucket];let E=oe[fe.indices.path];E||(E=""),n=new Nt(T,E),fe.postModify(n);break}}if(n==null)throw AN(e);return n}}class ON{constructor(e){this.promise_=Promise.reject(e)}getPromise(){return this.promise_}cancel(e=!1){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function FN(r,e,t){let n=1,s=null,i=null,o=!1,a=0;function c(){return a===2}let l=!1;function B(...V){l||(l=!0,e.apply(null,V))}function f(V){s=setTimeout(()=>{s=null,r(m,c())},V)}function p(){i&&clearTimeout(i)}function m(V,...j){if(l){p();return}if(V){p(),B.call(null,V,...j);return}if(c()||o){p(),B.call(null,V,...j);return}n<64&&(n*=2);let ee;a===1?(a=2,ee=0):ee=(n+Math.random())*1e3,f(ee)}let y=!1;function F(V){y||(y=!0,p(),!l&&(s!==null?(V||(a=2),clearTimeout(s),f(0)):V||(a=1)))}return f(0),i=setTimeout(()=>{o=!0,F(!0)},t),F}function LN(r){r(!1)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function kN(r){return r!==void 0}function xN(r){return typeof r=="object"&&!Array.isArray(r)}function Nf(r){return typeof r=="string"||r instanceof String}function yg(r){return Of()&&r instanceof Blob}function Of(){return typeof Blob<"u"}function Tg(r,e,t,n){if(n<e)throw kB(`Invalid value for '${r}'. Expected ${e} or greater.`);if(n>t)throw kB(`Invalid value for '${r}'. Expected ${t} or less.`)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Gu(r,e,t){let n=e;return t==null&&(n=`https://${e}`),`${t}://${n}/v0${r}`}function HI(r){const e=encodeURIComponent;let t="?";for(const n in r)if(r.hasOwnProperty(n)){const s=e(n)+"="+e(r[n]);t=t+s+"&"}return t=t.slice(0,-1),t}var os;(function(r){r[r.NO_ERROR=0]="NO_ERROR",r[r.NETWORK_ERROR=1]="NETWORK_ERROR",r[r.ABORT=2]="ABORT"})(os||(os={}));/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function VN(r,e){const t=r>=500&&r<600,s=[408,429].indexOf(r)!==-1,i=e.indexOf(r)!==-1;return t||s||i}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class MN{constructor(e,t,n,s,i,o,a,c,l,B,f,p=!0,m=!1){this.url_=e,this.method_=t,this.headers_=n,this.body_=s,this.successCodes_=i,this.additionalRetryCodes_=o,this.callback_=a,this.errorCallback_=c,this.timeout_=l,this.progressCallback_=B,this.connectionFactory_=f,this.retry=p,this.isUsingEmulator=m,this.pendingConnection_=null,this.backoffId_=null,this.canceled_=!1,this.appDelete_=!1,this.promise_=new Promise((y,F)=>{this.resolve_=y,this.reject_=F,this.start_()})}start_(){const e=(n,s)=>{if(s){n(!1,new Xa(!1,null,!0));return}const i=this.connectionFactory_();this.pendingConnection_=i;const o=a=>{const c=a.loaded,l=a.lengthComputable?a.total:-1;this.progressCallback_!==null&&this.progressCallback_(c,l)};this.progressCallback_!==null&&i.addUploadProgressListener(o),i.send(this.url_,this.method_,this.isUsingEmulator,this.body_,this.headers_).then(()=>{this.progressCallback_!==null&&i.removeUploadProgressListener(o),this.pendingConnection_=null;const a=i.getErrorCode()===os.NO_ERROR,c=i.getStatus();if(!a||VN(c,this.additionalRetryCodes_)&&this.retry){const B=i.getErrorCode()===os.ABORT;n(!1,new Xa(!1,null,B));return}const l=this.successCodes_.indexOf(c)!==-1;n(!0,new Xa(l,i))})},t=(n,s)=>{const i=this.resolve_,o=this.reject_,a=s.connection;if(s.wasSuccessCode)try{const c=this.callback_(a,a.getResponse());kN(c)?i(c):i()}catch(c){o(c)}else if(a!==null){const c=Pf();c.serverResponse=a.getErrorText(),this.errorCallback_?o(this.errorCallback_(a,c)):o(c)}else if(s.canceled){const c=this.appDelete_?UI():wN();o(c)}else{const c=TN();o(c)}};this.canceled_?t(!1,new Xa(!1,null,!0)):this.backoffId_=FN(e,t,this.timeout_)}getPromise(){return this.promise_}cancel(e){this.canceled_=!0,this.appDelete_=e||!1,this.backoffId_!==null&&LN(this.backoffId_),this.pendingConnection_!==null&&this.pendingConnection_.abort()}}class Xa{constructor(e,t,n){this.wasSuccessCode=e,this.connection=t,this.canceled=!!n}}function GN(r,e){e!==null&&e.length>0&&(r.Authorization="Firebase "+e)}function UN(r,e){r["X-Firebase-Storage-Version"]="webjs/"+(e??"AppManager")}function HN(r,e){e&&(r["X-Firebase-GMPID"]=e)}function qN(r,e){e!==null&&(r["X-Firebase-AppCheck"]=e)}function jN(r,e,t,n,s,i,o=!0,a=!1){const c=HI(r.urlParams),l=r.url+c,B=Object.assign({},r.headers);return HN(B,e),GN(B,t),UN(B,i),qN(B,n),new MN(l,r.method,B,r.body,r.successCodes,r.additionalRetryCodes,r.handler,r.errorHandler,r.timeout,r.progressCallback,s,o,a)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function KN(){return typeof BlobBuilder<"u"?BlobBuilder:typeof WebKitBlobBuilder<"u"?WebKitBlobBuilder:void 0}function JN(...r){const e=KN();if(e!==void 0){const t=new e;for(let n=0;n<r.length;n++)t.append(r[n]);return t.getBlob()}else{if(Of())return new Blob(r);throw new Oe(Ne.UNSUPPORTED_ENVIRONMENT,"This browser doesn't seem to support creating Blobs")}}function zN(r,e,t){return r.webkitSlice?r.webkitSlice(e,t):r.mozSlice?r.mozSlice(e,t):r.slice?r.slice(e,t):null}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function $N(r){if(typeof atob>"u")throw PN("base-64");return atob(r)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const hn={RAW:"raw",BASE64:"base64",BASE64URL:"base64url",DATA_URL:"data_url"};class xl{constructor(e,t){this.data=e,this.contentType=t||null}}function QN(r,e){switch(r){case hn.RAW:return new xl(qI(e));case hn.BASE64:case hn.BASE64URL:return new xl(jI(r,e));case hn.DATA_URL:return new xl(YN(e),XN(e))}throw Pf()}function qI(r){const e=[];for(let t=0;t<r.length;t++){let n=r.charCodeAt(t);if(n<=127)e.push(n);else if(n<=2047)e.push(192|n>>6,128|n&63);else if((n&64512)===55296)if(!(t<r.length-1&&(r.charCodeAt(t+1)&64512)===56320))e.push(239,191,189);else{const i=n,o=r.charCodeAt(++t);n=65536|(i&1023)<<10|o&1023,e.push(240|n>>18,128|n>>12&63,128|n>>6&63,128|n&63)}else(n&64512)===56320?e.push(239,191,189):e.push(224|n>>12,128|n>>6&63,128|n&63)}return new Uint8Array(e)}function WN(r){let e;try{e=decodeURIComponent(r)}catch{throw wo(hn.DATA_URL,"Malformed data URL.")}return qI(e)}function jI(r,e){switch(r){case hn.BASE64:{const s=e.indexOf("-")!==-1,i=e.indexOf("_")!==-1;if(s||i)throw wo(r,"Invalid character '"+(s?"-":"_")+"' found: is it base64url encoded?");break}case hn.BASE64URL:{const s=e.indexOf("+")!==-1,i=e.indexOf("/")!==-1;if(s||i)throw wo(r,"Invalid character '"+(s?"+":"/")+"' found: is it base64 encoded?");e=e.replace(/-/g,"+").replace(/_/g,"/");break}}let t;try{t=$N(e)}catch(s){throw s.message.includes("polyfill")?s:wo(r,"Invalid character found")}const n=new Uint8Array(t.length);for(let s=0;s<t.length;s++)n[s]=t.charCodeAt(s);return n}class KI{constructor(e){this.base64=!1,this.contentType=null;const t=e.match(/^data:([^,]+)?,/);if(t===null)throw wo(hn.DATA_URL,"Must be formatted 'data:[<mediatype>][;base64],<data>");const n=t[1]||null;n!=null&&(this.base64=ZN(n,";base64"),this.contentType=this.base64?n.substring(0,n.length-7):n),this.rest=e.substring(e.indexOf(",")+1)}}function YN(r){const e=new KI(r);return e.base64?jI(hn.BASE64,e.rest):WN(e.rest)}function XN(r){return new KI(r).contentType}function ZN(r,e){return r.length>=e.length?r.substring(r.length-e.length)===e:!1}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ar{constructor(e,t){let n=0,s="";yg(e)?(this.data_=e,n=e.size,s=e.type):e instanceof ArrayBuffer?(t?this.data_=new Uint8Array(e):(this.data_=new Uint8Array(e.byteLength),this.data_.set(new Uint8Array(e))),n=this.data_.length):e instanceof Uint8Array&&(t?this.data_=e:(this.data_=new Uint8Array(e.length),this.data_.set(e)),n=e.length),this.size_=n,this.type_=s}size(){return this.size_}type(){return this.type_}slice(e,t){if(yg(this.data_)){const n=this.data_,s=zN(n,e,t);return s===null?null:new ar(s)}else{const n=new Uint8Array(this.data_.buffer,e,t-e);return new ar(n,!0)}}static getBlob(...e){if(Of()){const t=e.map(n=>n instanceof ar?n.data_:n);return new ar(JN.apply(null,t))}else{const t=e.map(o=>Nf(o)?QN(hn.RAW,o).data:o.data_);let n=0;t.forEach(o=>{n+=o.byteLength});const s=new Uint8Array(n);let i=0;return t.forEach(o=>{for(let a=0;a<o.length;a++)s[i++]=o[a]}),new ar(s,!0)}}uploadData(){return this.data_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function JI(r){let e;try{e=JSON.parse(r)}catch{return null}return xN(e)?e:null}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function eO(r){if(r.length===0)return null;const e=r.lastIndexOf("/");return e===-1?"":r.slice(0,e)}function tO(r,e){const t=e.split("/").filter(n=>n.length>0).join("/");return r.length===0?t:r+"/"+t}function zI(r){const e=r.lastIndexOf("/",r.length-2);return e===-1?r:r.slice(e+1)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function nO(r,e){return e}class Bt{constructor(e,t,n,s){this.server=e,this.local=t||e,this.writable=!!n,this.xform=s||nO}}let Za=null;function rO(r){return!Nf(r)||r.length<2?r:zI(r)}function $I(){if(Za)return Za;const r=[];r.push(new Bt("bucket")),r.push(new Bt("generation")),r.push(new Bt("metageneration")),r.push(new Bt("name","fullPath",!0));function e(i,o){return rO(o)}const t=new Bt("name");t.xform=e,r.push(t);function n(i,o){return o!==void 0?Number(o):o}const s=new Bt("size");return s.xform=n,r.push(s),r.push(new Bt("timeCreated")),r.push(new Bt("updated")),r.push(new Bt("md5Hash",null,!0)),r.push(new Bt("cacheControl",null,!0)),r.push(new Bt("contentDisposition",null,!0)),r.push(new Bt("contentEncoding",null,!0)),r.push(new Bt("contentLanguage",null,!0)),r.push(new Bt("contentType",null,!0)),r.push(new Bt("metadata","customMetadata",!0)),Za=r,Za}function sO(r,e){function t(){const n=r.bucket,s=r.fullPath,i=new Nt(n,s);return e._makeStorageReference(i)}Object.defineProperty(r,"ref",{get:t})}function iO(r,e,t){const n={};n.type="file";const s=t.length;for(let i=0;i<s;i++){const o=t[i];n[o.local]=o.xform(n,e[o.server])}return sO(n,r),n}function QI(r,e,t){const n=JI(e);return n===null?null:iO(r,n,t)}function oO(r,e,t,n){const s=JI(e);if(s===null||!Nf(s.downloadTokens))return null;const i=s.downloadTokens;if(i.length===0)return null;const o=encodeURIComponent;return i.split(",").map(l=>{const B=r.bucket,f=r.fullPath,p="/b/"+o(B)+"/o/"+o(f),m=Gu(p,t,n),y=HI({alt:"media",token:l});return m+y})[0]}function aO(r,e){const t={},n=e.length;for(let s=0;s<n;s++){const i=e[s];i.writable&&(t[i.server]=r[i.local])}return JSON.stringify(t)}class Ff{constructor(e,t,n,s){this.url=e,this.method=t,this.handler=n,this.timeout=s,this.urlParams={},this.headers={},this.body=null,this.errorHandler=null,this.progressCallback=null,this.successCodes=[200],this.additionalRetryCodes=[]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function WI(r){if(!r)throw Pf()}function cO(r,e){function t(n,s){const i=QI(r,s,e);return WI(i!==null),i}return t}function uO(r,e){function t(n,s){const i=QI(r,s,e);return WI(i!==null),oO(i,s,r.host,r._protocol)}return t}function YI(r){function e(t,n){let s;return t.getStatus()===401?t.getErrorText().includes("Firebase App Check token is invalid")?s=DN():s=IN():t.getStatus()===402?s=EN(r.bucket):t.getStatus()===403?s=yN(r.path):s=n,s.status=t.getStatus(),s.serverResponse=n.serverResponse,s}return e}function XI(r){const e=YI(r);function t(n,s){let i=e(n,s);return n.getStatus()===404&&(i=_N(r.path)),i.serverResponse=s.serverResponse,i}return t}function lO(r,e,t){const n=e.fullServerUrl(),s=Gu(n,r.host,r._protocol),i="GET",o=r.maxOperationRetryTime,a=new Ff(s,i,uO(r,t),o);return a.errorHandler=XI(e),a}function BO(r,e){const t=e.fullServerUrl(),n=Gu(t,r.host,r._protocol),s="DELETE",i=r.maxOperationRetryTime;function o(c,l){}const a=new Ff(n,s,o,i);return a.successCodes=[200,204],a.errorHandler=XI(e),a}function hO(r,e){return r&&r.contentType||e&&e.type()||"application/octet-stream"}function fO(r,e,t){const n=Object.assign({},t);return n.fullPath=r.path,n.size=e.size(),n.contentType||(n.contentType=hO(null,e)),n}function dO(r,e,t,n,s){const i=e.bucketOnlyServerUrl(),o={"X-Goog-Upload-Protocol":"multipart"};function a(){let ee="";for(let se=0;se<2;se++)ee=ee+Math.random().toString().slice(2);return ee}const c=a();o["Content-Type"]="multipart/related; boundary="+c;const l=fO(e,n,s),B=aO(l,t),f="--"+c+`\r
Content-Type: application/json; charset=utf-8\r
\r
`+B+`\r
--`+c+`\r
Content-Type: `+l.contentType+`\r
\r
`,p=`\r
--`+c+"--",m=ar.getBlob(f,n,p);if(m===null)throw bN();const y={name:l.fullPath},F=Gu(i,r.host,r._protocol),V="POST",j=r.maxUploadRetryTime,Y=new Ff(F,V,cO(r,t),j);return Y.urlParams=y,Y.headers=o,Y.body=m.uploadData(),Y.errorHandler=YI(e),Y}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pO{constructor(){this.sent_=!1,this.xhr_=new XMLHttpRequest,this.initXhr(),this.errorCode_=os.NO_ERROR,this.sendPromise_=new Promise(e=>{this.xhr_.addEventListener("abort",()=>{this.errorCode_=os.ABORT,e()}),this.xhr_.addEventListener("error",()=>{this.errorCode_=os.NETWORK_ERROR,e()}),this.xhr_.addEventListener("load",()=>{e()})})}send(e,t,n,s,i){if(this.sent_)throw no("cannot .send() more than once");if(Vn(e)&&n&&(this.xhr_.withCredentials=!0),this.sent_=!0,this.xhr_.open(t,e,!0),i!==void 0)for(const o in i)i.hasOwnProperty(o)&&this.xhr_.setRequestHeader(o,i[o].toString());return s!==void 0?this.xhr_.send(s):this.xhr_.send(),this.sendPromise_}getErrorCode(){if(!this.sent_)throw no("cannot .getErrorCode() before sending");return this.errorCode_}getStatus(){if(!this.sent_)throw no("cannot .getStatus() before sending");try{return this.xhr_.status}catch{return-1}}getResponse(){if(!this.sent_)throw no("cannot .getResponse() before sending");return this.xhr_.response}getErrorText(){if(!this.sent_)throw no("cannot .getErrorText() before sending");return this.xhr_.statusText}abort(){this.xhr_.abort()}getResponseHeader(e){return this.xhr_.getResponseHeader(e)}addUploadProgressListener(e){this.xhr_.upload!=null&&this.xhr_.upload.addEventListener("progress",e)}removeUploadProgressListener(e){this.xhr_.upload!=null&&this.xhr_.upload.removeEventListener("progress",e)}}class CO extends pO{initXhr(){this.xhr_.responseType="text"}}function Lf(){return new CO}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ms{constructor(e,t){this._service=e,t instanceof Nt?this._location=t:this._location=Nt.makeFromUrl(t,e.host)}toString(){return"gs://"+this._location.bucket+"/"+this._location.path}_newRef(e,t){return new ms(e,t)}get root(){const e=new Nt(this._location.bucket,"");return this._newRef(this._service,e)}get bucket(){return this._location.bucket}get fullPath(){return this._location.path}get name(){return zI(this._location.path)}get storage(){return this._service}get parent(){const e=eO(this._location.path);if(e===null)return null;const t=new Nt(this._location.bucket,e);return new ms(this._service,t)}_throwIfRoot(e){if(this._location.path==="")throw NN(e)}}function gO(r,e,t){r._throwIfRoot("uploadBytes");const n=dO(r.storage,r._location,$I(),new ar(e,!0),t);return r.storage.makeRequestWithTokens(n,Lf).then(s=>({metadata:s,ref:r}))}function mO(r){r._throwIfRoot("getDownloadURL");const e=lO(r.storage,r._location,$I());return r.storage.makeRequestWithTokens(e,Lf).then(t=>{if(t===null)throw SN();return t})}function _O(r){r._throwIfRoot("deleteObject");const e=BO(r.storage,r._location);return r.storage.makeRequestWithTokens(e,Lf)}function EO(r,e){const t=tO(r._location.path,e),n=new Nt(r._location.bucket,t);return new ms(r.storage,n)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function IO(r){return/^[A-Za-z]+:\/\//.test(r)}function DO(r,e){return new ms(r,e)}function ZI(r,e){if(r instanceof kf){const t=r;if(t._bucket==null)throw RN();const n=new ms(t,t._bucket);return e!=null?ZI(n,e):n}else return e!==void 0?EO(r,e):r}function yO(r,e){if(e&&IO(e)){if(r instanceof kf)return DO(r,e);throw kB("To use ref(service, url), the first argument must be a Storage instance.")}else return ZI(r,e)}function wg(r,e){const t=e?.[GI];return t==null?null:Nt.makeFromBucketSpec(t,r)}function TO(r,e,t,n={}){r.host=`${e}:${t}`;const s=Vn(e);s&&au(`https://${r.host}/b`),r._isUsingEmulator=!0,r._protocol=s?"https":"http";const{mockUserToken:i}=n;i&&(r._overrideAuthToken=typeof i=="string"?i:My(i,r.app.options.projectId))}class kf{constructor(e,t,n,s,i,o=!1){this.app=e,this._authProvider=t,this._appCheckProvider=n,this._url=s,this._firebaseVersion=i,this._isUsingEmulator=o,this._bucket=null,this._host=MI,this._protocol="https",this._appId=null,this._deleted=!1,this._maxOperationRetryTime=gN,this._maxUploadRetryTime=mN,this._requests=new Set,s!=null?this._bucket=Nt.makeFromBucketSpec(s,this._host):this._bucket=wg(this._host,this.app.options)}get host(){return this._host}set host(e){this._host=e,this._url!=null?this._bucket=Nt.makeFromBucketSpec(this._url,e):this._bucket=wg(e,this.app.options)}get maxUploadRetryTime(){return this._maxUploadRetryTime}set maxUploadRetryTime(e){Tg("time",0,Number.POSITIVE_INFINITY,e),this._maxUploadRetryTime=e}get maxOperationRetryTime(){return this._maxOperationRetryTime}set maxOperationRetryTime(e){Tg("time",0,Number.POSITIVE_INFINITY,e),this._maxOperationRetryTime=e}async _getAuthToken(){if(this._overrideAuthToken)return this._overrideAuthToken;const e=this._authProvider.getImmediate({optional:!0});if(e){const t=await e.getToken();if(t!==null)return t.accessToken}return null}async _getAppCheckToken(){if(mt(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=this._appCheckProvider.getImmediate({optional:!0});return e?(await e.getToken()).token:null}_delete(){return this._deleted||(this._deleted=!0,this._requests.forEach(e=>e.cancel()),this._requests.clear()),Promise.resolve()}_makeStorageReference(e){return new ms(this,e)}_makeRequest(e,t,n,s,i=!0){if(this._deleted)return new ON(UI());{const o=jN(e,this._appId,n,s,t,this._firebaseVersion,i,this._isUsingEmulator);return this._requests.add(o),o.getPromise().then(()=>this._requests.delete(o),()=>this._requests.delete(o)),o}}async makeRequestWithTokens(e,t){const[n,s]=await Promise.all([this._getAuthToken(),this._getAppCheckToken()]);return this._makeRequest(e,t,n,s).getPromise()}}const Ag="@firebase/storage",vg="0.14.5";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const eD="storage";function Px(r,e,t){return r=ce(r),gO(r,e,t)}function Nx(r){return r=ce(r),mO(r)}function Ox(r){return r=ce(r),_O(r)}function Fx(r,e){return r=ce(r),yO(r,e)}function Lx(r=ea(),e){r=ce(r);const n=Zt(r,eD).getImmediate({identifier:e}),s=am("storage");return s&&wO(n,...s),n}function wO(r,e,t,n={}){TO(r,e,t,n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function AO(r,{instanceIdentifier:e}){const t=r.getProvider("app").getImmediate(),n=r.getProvider("auth-internal"),s=r.getProvider("app-check-internal");return new kf(t,n,s,e,Is)}function vO(){Lt(new Dt(eD,AO,"PUBLIC").setMultipleInstances(!0)),Qe(Ag,vg,""),Qe(Ag,vg,"esm2020")}vO();/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const RO="type.googleapis.com/google.protobuf.Int64Value",bO="type.googleapis.com/google.protobuf.UInt64Value";function tD(r,e){const t={};for(const n in r)r.hasOwnProperty(n)&&(t[n]=e(r[n]));return t}function eu(r){if(r==null)return null;if(r instanceof Number&&(r=r.valueOf()),typeof r=="number"&&isFinite(r)||r===!0||r===!1||Object.prototype.toString.call(r)==="[object String]")return r;if(r instanceof Date)return r.toISOString();if(Array.isArray(r))return r.map(e=>eu(e));if(typeof r=="function"||typeof r=="object")return tD(r,e=>eu(e));throw new Error("Data cannot be encoded in JSON: "+r)}function mi(r){if(r==null)return r;if(r["@type"])switch(r["@type"]){case RO:case bO:{const e=Number(r.value);if(isNaN(e))throw new Error("Data cannot be decoded from JSON: "+r);return e}default:throw new Error("Data cannot be decoded from JSON: "+r)}return Array.isArray(r)?r.map(e=>mi(e)):typeof r=="function"||typeof r=="object"?tD(r,e=>mi(e)):r}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const xf="functions";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Rg={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class It extends xt{constructor(e,t,n,s){super(`${xf}/${e}`,t||"",s!=null?{url:s}:void 0),this.details=n,Object.setPrototypeOf(this,It.prototype)}}function SO(r){if(r>=200&&r<300)return"ok";switch(r){case 0:return"internal";case 400:return"invalid-argument";case 401:return"unauthenticated";case 403:return"permission-denied";case 404:return"not-found";case 409:return"aborted";case 429:return"resource-exhausted";case 499:return"cancelled";case 500:return"internal";case 501:return"unimplemented";case 503:return"unavailable";case 504:return"deadline-exceeded"}return"unknown"}function tu(r,e,t){let n=SO(r),s=n,i;try{const o=e&&e.error;if(o){const a=o.status;if(typeof a=="string"){if(!Rg[a])return new It("internal",`Unknown backend error status: ${a} [${r}]`,void 0,t);n=Rg[a],s=`Backend error status: ${a}`}const c=o.message;typeof c=="string"&&(s=c),i=o.details,i!==void 0&&(i=mi(i))}}catch{}return n==="ok"?null:new It(n,`${s} [${r}]`,i,t)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class PO{constructor(e,t,n,s){this.app=e,this.auth=null,this.messaging=null,this.appCheck=null,this.serverAppAppCheckToken=null,mt(e)&&e.settings.appCheckToken&&(this.serverAppAppCheckToken=e.settings.appCheckToken),this.auth=t.getImmediate({optional:!0}),this.messaging=n.getImmediate({optional:!0}),this.auth||t.get().then(i=>this.auth=i,()=>{}),this.messaging||n.get().then(i=>this.messaging=i,()=>{}),this.appCheck||s?.get().then(i=>this.appCheck=i,()=>{})}async getAuthToken(){if(this.auth)try{return(await this.auth.getToken())?.accessToken}catch{return}}async getMessagingToken(){if(!(!this.messaging||!("Notification"in self)||Notification.permission!=="granted"))try{return await this.messaging.getToken()}catch{return}}async getAppCheckToken(e){if(this.serverAppAppCheckToken)return this.serverAppAppCheckToken;if(this.appCheck){const t=e?await this.appCheck.getLimitedUseToken():await this.appCheck.getToken();return t.error?null:t.token}return null}async getContext(e){const t=await this.getAuthToken(),n=await this.getMessagingToken(),s=await this.getAppCheckToken(e);return{authToken:t,messagingToken:n,appCheckToken:s}}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const xB="us-central1",NO=/^data: (.*?)(?:\n|$)/;function OO(r){let e=null;return{promise:new Promise((t,n)=>{e=setTimeout(()=>{n(new It("deadline-exceeded","deadline-exceeded"))},r)}),cancel:()=>{e&&clearTimeout(e)}}}class FO{constructor(e,t,n,s,i=xB,o=(...a)=>fetch(...a)){this.app=e,this.fetchImpl=o,this.emulatorOrigin=null,this.contextProvider=new PO(e,t,n,s),this.cancelAllRequests=new Promise(a=>{this.deleteService=()=>Promise.resolve(a())});try{const a=new URL(i);this.customDomain=a.origin+(a.pathname==="/"?"":a.pathname),this.region=xB}catch{this.customDomain=null,this.region=i}}_delete(){return this.deleteService()}_url(e){const t=this.app.options.projectId;return this.emulatorOrigin!==null?`${this.emulatorOrigin}/${t}/${this.region}/${e}`:this.customDomain!==null?`${this.customDomain}/${e}`:`https://${this.region}-${t}.cloudfunctions.net/${e}`}}function LO(r,e,t){const n=Vn(e);r.emulatorOrigin=`http${n?"s":""}://${e}:${t}`,n&&au(r.emulatorOrigin+"/backends")}function kO(r,e,t){const n=s=>VO(r,e,s,t||{});return n.stream=(s,i)=>GO(r,e,s,i),n}function nD(r){return r.emulatorOrigin&&Vn(r.emulatorOrigin)?"include":void 0}async function xO(r,e,t,n,s){t["Content-Type"]="application/json";let i;try{i=await n(r,{method:"POST",body:JSON.stringify(e),headers:t,credentials:nD(s)})}catch{return{status:0,json:null}}let o=null;try{o=await i.json()}catch{}return{status:i.status,json:o}}async function rD(r,e){const t={},n=await r.contextProvider.getContext(e.limitedUseAppCheckTokens);return n.authToken&&(t.Authorization="Bearer "+n.authToken),n.messagingToken&&(t["Firebase-Instance-ID-Token"]=n.messagingToken),n.appCheckToken!==null&&(t["X-Firebase-AppCheck"]=n.appCheckToken),t}function VO(r,e,t,n){const s=r._url(e);return MO(r,s,t,n)}async function MO(r,e,t,n){t=eu(t);const s={data:t},i=await rD(r,n),o=n.timeout||7e4,a=OO(o),c=await Promise.race([xO(e,s,i,r.fetchImpl,r),a.promise,r.cancelAllRequests]);if(a.cancel(),!c)throw new It("cancelled","Firebase Functions instance was deleted.");const l=tu(c.status,c.json,e);if(l)throw l;if(!c.json)throw new It("internal","Response is not valid JSON object.",void 0,e);let B=c.json.data;if(typeof B>"u"&&(B=c.json.result),typeof B>"u")throw new It("internal","Response is missing data field.",void 0,e);return{data:mi(B)}}function GO(r,e,t,n){const s=r._url(e);return UO(r,s,t,n||{})}async function UO(r,e,t,n){t=eu(t);const s={data:t},i=await rD(r,n);i["Content-Type"]="application/json",i.Accept="text/event-stream";let o;try{o=await r.fetchImpl(e,{method:"POST",body:JSON.stringify(s),headers:i,signal:n?.signal,credentials:nD(r)})}catch(p){if(p instanceof Error&&p.name==="AbortError"){const y=new It("cancelled","Request was cancelled.");return{data:Promise.reject(y),stream:{[Symbol.asyncIterator](){return{next(){return Promise.reject(y)}}}}}}const m=tu(0,null,e);return{data:Promise.reject(m),stream:{[Symbol.asyncIterator](){return{next(){return Promise.reject(m)}}}}}}let a,c;const l=new Promise((p,m)=>{a=p,c=m});n?.signal?.addEventListener("abort",()=>{const p=new It("cancelled","Request was cancelled.");c(p)});const B=o.body.getReader(),f=HO(B,a,c,n?.signal,e);return{stream:{[Symbol.asyncIterator](){const p=f.getReader();return{async next(){const{value:m,done:y}=await p.read();return{value:m,done:y}},async return(){return await p.cancel(),{done:!0,value:void 0}}}}},data:l}}function HO(r,e,t,n,s){const i=(a,c)=>{const l=a.match(NO);if(!l)return;const B=l[1];try{const f=JSON.parse(B);if("result"in f){e(mi(f.result));return}if("message"in f){c.enqueue(mi(f.message));return}if("error"in f){const p=tu(0,f,s);c.error(p),t(p);return}}catch(f){if(f instanceof It){c.error(f),t(f);return}}},o=new TextDecoder;return new ReadableStream({start(a){let c="";return l();async function l(){if(n?.aborted){const B=new It("cancelled","Request was cancelled");return a.error(B),t(B),Promise.resolve()}try{const{value:B,done:f}=await r.read();if(f){c.trim()&&i(c.trim(),a),a.close();return}if(n?.aborted){const m=new It("cancelled","Request was cancelled");a.error(m),t(m),await r.cancel();return}c+=o.decode(B,{stream:!0});const p=c.split(`
`);c=p.pop()||"";for(const m of p)m.trim()&&i(m.trim(),a);return l()}catch(B){const f=B instanceof It?B:tu(0,null,s);a.error(f),t(f)}}},cancel(){return r.cancel()}})}const bg="@firebase/functions",Sg="0.14.0";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const qO="auth-internal",jO="app-check-internal",KO="messaging-internal";function JO(r){const e=(t,{instanceIdentifier:n})=>{const s=t.getProvider("app").getImmediate(),i=t.getProvider(qO),o=t.getProvider(KO),a=t.getProvider(jO);return new FO(s,i,o,a,n)};Lt(new Dt(xf,e,"PUBLIC").setMultipleInstances(!0)),Qe(bg,Sg,r),Qe(bg,Sg,"esm2020")}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function kx(r=ea(),e=xB){const n=Zt(ce(r),xf).getImmediate({identifier:e}),s=am("functions");return s&&zO(n,...s),n}function zO(r,e,t){LO(ce(r),e,t)}function xx(r,e,t){return kO(ce(r),e,t)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */JO();const sD="@firebase/installations",Vf="0.6.24";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const iD=1e4,oD=`w:${Vf}`,aD="FIS_v2",$O="https://firebaseinstallations.googleapis.com/v1",QO=3600*1e3,WO="installations",YO="Installations";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const XO={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"not-registered":"Firebase Installation is not registered.","installation-not-found":"Firebase Installation not found.","request-failed":'{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',"app-offline":"Could not process request. Application offline.","delete-pending-registration":"Can't delete installation while there is a pending registration request."},_s=new vr(WO,YO,XO);function cD(r){return r instanceof xt&&r.code.includes("request-failed")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function uD({projectId:r}){return`${$O}/projects/${r}/installations`}function lD(r){return{token:r.token,requestStatus:2,expiresIn:eF(r.expiresIn),creationTime:Date.now()}}async function BD(r,e){const n=(await e.json()).error;return _s.create("request-failed",{requestName:r,serverCode:n.code,serverMessage:n.message,serverStatus:n.status})}function hD({apiKey:r}){return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":r})}function ZO(r,{refreshToken:e}){const t=hD(r);return t.append("Authorization",tF(e)),t}async function fD(r){const e=await r();return e.status>=500&&e.status<600?r():e}function eF(r){return Number(r.replace("s","000"))}function tF(r){return`${aD} ${r}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function nF({appConfig:r,heartbeatServiceProvider:e},{fid:t}){const n=uD(r),s=hD(r),i=e.getImmediate({optional:!0});if(i){const l=await i.getHeartbeatsHeader();l&&s.append("x-firebase-client",l)}const o={fid:t,authVersion:aD,appId:r.appId,sdkVersion:oD},a={method:"POST",headers:s,body:JSON.stringify(o)},c=await fD(()=>fetch(n,a));if(c.ok){const l=await c.json();return{fid:l.fid||t,registrationStatus:2,refreshToken:l.refreshToken,authToken:lD(l.authToken)}}else throw await BD("Create Installation",c)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function dD(r){return new Promise(e=>{setTimeout(e,r)})}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function rF(r){return btoa(String.fromCharCode(...r)).replace(/\+/g,"-").replace(/\//g,"_")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const sF=/^[cdef][\w-]{21}$/,VB="";function iF(){try{const r=new Uint8Array(17);(self.crypto||self.msCrypto).getRandomValues(r),r[0]=112+r[0]%16;const t=oF(r);return sF.test(t)?t:VB}catch{return VB}}function oF(r){return rF(r).substr(0,22)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Uu(r){return`${r.appName}!${r.appId}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const pD=new Map;function CD(r,e){const t=Uu(r);gD(t,e),aF(t,e)}function gD(r,e){const t=pD.get(r);if(t)for(const n of t)n(e)}function aF(r,e){const t=cF();t&&t.postMessage({key:r,fid:e}),uF()}let Xr=null;function cF(){return!Xr&&"BroadcastChannel"in self&&(Xr=new BroadcastChannel("[Firebase] FID Change"),Xr.onmessage=r=>{gD(r.data.key,r.data.fid)}),Xr}function uF(){pD.size===0&&Xr&&(Xr.close(),Xr=null)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const lF="firebase-installations-database",BF=1,Es="firebase-installations-store";let Vl=null;function Mf(){return Vl||(Vl=Cm(lF,BF,{upgrade:(r,e)=>{switch(e){case 0:r.createObjectStore(Es)}}})),Vl}async function nu(r,e){const t=Uu(r),s=(await Mf()).transaction(Es,"readwrite"),i=s.objectStore(Es),o=await i.get(t);return await i.put(e,t),await s.done,(!o||o.fid!==e.fid)&&CD(r,e.fid),e}async function mD(r){const e=Uu(r),n=(await Mf()).transaction(Es,"readwrite");await n.objectStore(Es).delete(e),await n.done}async function Hu(r,e){const t=Uu(r),s=(await Mf()).transaction(Es,"readwrite"),i=s.objectStore(Es),o=await i.get(t),a=e(o);return a===void 0?await i.delete(t):await i.put(a,t),await s.done,a&&(!o||o.fid!==a.fid)&&CD(r,a.fid),a}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Gf(r){let e;const t=await Hu(r.appConfig,n=>{const s=hF(n),i=fF(r,s);return e=i.registrationPromise,i.installationEntry});return t.fid===VB?{installationEntry:await e}:{installationEntry:t,registrationPromise:e}}function hF(r){const e=r||{fid:iF(),registrationStatus:0};return _D(e)}function fF(r,e){if(e.registrationStatus===0){if(!navigator.onLine){const s=Promise.reject(_s.create("app-offline"));return{installationEntry:e,registrationPromise:s}}const t={fid:e.fid,registrationStatus:1,registrationTime:Date.now()},n=dF(r,t);return{installationEntry:t,registrationPromise:n}}else return e.registrationStatus===1?{installationEntry:e,registrationPromise:pF(r)}:{installationEntry:e}}async function dF(r,e){try{const t=await nF(r,e);return nu(r.appConfig,t)}catch(t){throw cD(t)&&t.customData.serverCode===409?await mD(r.appConfig):await nu(r.appConfig,{fid:e.fid,registrationStatus:0}),t}}async function pF(r){let e=await Pg(r.appConfig);for(;e.registrationStatus===1;)await dD(100),e=await Pg(r.appConfig);if(e.registrationStatus===0){const{installationEntry:t,registrationPromise:n}=await Gf(r);return n||t}return e}function Pg(r){return Hu(r,e=>{if(!e)throw _s.create("installation-not-found");return _D(e)})}function _D(r){return CF(r)?{fid:r.fid,registrationStatus:0}:r}function CF(r){return r.registrationStatus===1&&r.registrationTime+iD<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function gF({appConfig:r,heartbeatServiceProvider:e},t){const n=mF(r,t),s=ZO(r,t),i=e.getImmediate({optional:!0});if(i){const l=await i.getHeartbeatsHeader();l&&s.append("x-firebase-client",l)}const o={installation:{sdkVersion:oD,appId:r.appId}},a={method:"POST",headers:s,body:JSON.stringify(o)},c=await fD(()=>fetch(n,a));if(c.ok){const l=await c.json();return lD(l)}else throw await BD("Generate Auth Token",c)}function mF(r,{fid:e}){return`${uD(r)}/${e}/authTokens:generate`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Uf(r,e=!1){let t;const n=await Hu(r.appConfig,i=>{if(!ED(i))throw _s.create("not-registered");const o=i.authToken;if(!e&&IF(o))return i;if(o.requestStatus===1)return t=_F(r,e),i;{if(!navigator.onLine)throw _s.create("app-offline");const a=yF(i);return t=EF(r,a),a}});return t?await t:n.authToken}async function _F(r,e){let t=await Ng(r.appConfig);for(;t.authToken.requestStatus===1;)await dD(100),t=await Ng(r.appConfig);const n=t.authToken;return n.requestStatus===0?Uf(r,e):n}function Ng(r){return Hu(r,e=>{if(!ED(e))throw _s.create("not-registered");const t=e.authToken;return TF(t)?{...e,authToken:{requestStatus:0}}:e})}async function EF(r,e){try{const t=await gF(r,e),n={...e,authToken:t};return await nu(r.appConfig,n),t}catch(t){if(cD(t)&&(t.customData.serverCode===401||t.customData.serverCode===404))await mD(r.appConfig);else{const n={...e,authToken:{requestStatus:0}};await nu(r.appConfig,n)}throw t}}function ED(r){return r!==void 0&&r.registrationStatus===2}function IF(r){return r.requestStatus===2&&!DF(r)}function DF(r){const e=Date.now();return e<r.creationTime||r.creationTime+r.expiresIn<e+QO}function yF(r){const e={requestStatus:1,requestTime:Date.now()};return{...r,authToken:e}}function TF(r){return r.requestStatus===1&&r.requestTime+iD<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function wF(r){const e=r,{installationEntry:t,registrationPromise:n}=await Gf(e);return n?n.catch(console.error):Uf(e).catch(console.error),t.fid}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function AF(r,e=!1){const t=r;return await vF(t),(await Uf(t,e)).token}async function vF(r){const{registrationPromise:e}=await Gf(r);e&&await e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function RF(r){if(!r||!r.options)throw Ml("App Configuration");if(!r.name)throw Ml("App Name");const e=["projectId","apiKey","appId"];for(const t of e)if(!r.options[t])throw Ml(t);return{appName:r.name,projectId:r.options.projectId,apiKey:r.options.apiKey,appId:r.options.appId}}function Ml(r){return _s.create("missing-app-config-values",{valueName:r})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ID="installations",bF="installations-internal",SF=r=>{const e=r.getProvider("app").getImmediate(),t=RF(e),n=Zt(e,"heartbeat");return{app:e,appConfig:t,heartbeatServiceProvider:n,_delete:()=>Promise.resolve()}},PF=r=>{const e=r.getProvider("app").getImmediate(),t=Zt(e,ID).getImmediate();return{getId:()=>wF(t),getToken:s=>AF(t,s)}};function NF(){Lt(new Dt(ID,SF,"PUBLIC")),Lt(new Dt(bF,PF,"PRIVATE"))}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */NF();Qe(sD,Vf);Qe(sD,Vf,"esm2020");/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ru="analytics",OF="firebase_id",FF="origin",LF=60*1e3,kF="https://firebase.googleapis.com/v1alpha/projects/-/apps/{app-id}/webConfig",Hf="https://www.googletagmanager.com/gtag/js";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ot=new Zo("@firebase/analytics");/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const xF={"already-exists":"A Firebase Analytics instance with the appId {$id}  already exists. Only one Firebase Analytics instance can be created for each appId.","already-initialized":"initializeAnalytics() cannot be called again with different options than those it was initially called with. It can be called again with the same options to return the existing instance, or getAnalytics() can be used to get a reference to the already-initialized instance.","already-initialized-settings":"Firebase Analytics has already been initialized.settings() must be called before initializing any Analytics instanceor it will have no effect.","interop-component-reg-failed":"Firebase Analytics Interop Component failed to instantiate: {$reason}","invalid-analytics-context":"Firebase Analytics is not supported in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","indexeddb-unavailable":"IndexedDB unavailable or restricted in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","fetch-throttle":"The config fetch request timed out while in an exponential backoff state. Unix timestamp in milliseconds when fetch request throttling ends: {$throttleEndTimeMillis}.","config-fetch-failed":"Dynamic config fetch failed: [{$httpStatus}] {$responseMessage}","no-api-key":'The "apiKey" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid API key.',"no-app-id":'The "appId" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid app ID.',"no-client-id":'The "client_id" field is empty.',"invalid-gtag-resource":"Trusted Types detected an invalid gtag resource: {$gtagURL}."},Ft=new vr("analytics","Analytics",xF);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function VF(r){if(!r.startsWith(Hf)){const e=Ft.create("invalid-gtag-resource",{gtagURL:r});return ot.warn(e.message),""}return r}function DD(r){return Promise.all(r.map(e=>e.catch(t=>t)))}function MF(r,e){let t;return window.trustedTypes&&(t=window.trustedTypes.createPolicy(r,e)),t}function GF(r,e){const t=MF("firebase-js-sdk-policy",{createScriptURL:VF}),n=document.createElement("script"),s=`${Hf}?l=${r}&id=${e}`;n.src=t?t?.createScriptURL(s):s,n.async=!0,document.head.appendChild(n)}function UF(r){let e=[];return Array.isArray(window[r])?e=window[r]:window[r]=e,e}async function HF(r,e,t,n,s,i){const o=n[s];try{if(o)await e[o];else{const c=(await DD(t)).find(l=>l.measurementId===s);c&&await e[c.appId]}}catch(a){ot.error(a)}r("config",s,i)}async function qF(r,e,t,n,s){try{let i=[];if(s&&s.send_to){let o=s.send_to;Array.isArray(o)||(o=[o]);const a=await DD(t);for(const c of o){const l=a.find(f=>f.measurementId===c),B=l&&e[l.appId];if(B)i.push(B);else{i=[];break}}}i.length===0&&(i=Object.values(e)),await Promise.all(i),r("event",n,s||{})}catch(i){ot.error(i)}}function jF(r,e,t,n){async function s(i,...o){try{if(i==="event"){const[a,c]=o;await qF(r,e,t,a,c)}else if(i==="config"){const[a,c]=o;await HF(r,e,t,n,a,c)}else if(i==="consent"){const[a,c]=o;r("consent",a,c)}else if(i==="get"){const[a,c,l]=o;r("get",a,c,l)}else if(i==="set"){const[a]=o;r("set",a)}else r(i,...o)}catch(a){ot.error(a)}}return s}function KF(r,e,t,n,s){let i=function(...o){window[n].push(arguments)};return window[s]&&typeof window[s]=="function"&&(i=window[s]),window[s]=jF(i,r,e,t),{gtagCore:i,wrappedGtag:window[s]}}function JF(r){const e=window.document.getElementsByTagName("script");for(const t of Object.values(e))if(t.src&&t.src.includes(Hf)&&t.src.includes(r))return t;return null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const zF=30,$F=1e3;class QF{constructor(e={},t=$F){this.throttleMetadata=e,this.intervalMillis=t}getThrottleMetadata(e){return this.throttleMetadata[e]}setThrottleMetadata(e,t){this.throttleMetadata[e]=t}deleteThrottleMetadata(e){delete this.throttleMetadata[e]}}const yD=new QF;function WF(r){return new Headers({Accept:"application/json","x-goog-api-key":r})}async function YF(r){const{appId:e,apiKey:t}=r,n={method:"GET",headers:WF(t)},s=kF.replace("{app-id}",e),i=await fetch(s,n);if(i.status!==200&&i.status!==304){let o="";try{const a=await i.json();a.error?.message&&(o=a.error.message)}catch{}throw Ft.create("config-fetch-failed",{httpStatus:i.status,responseMessage:o})}return i.json()}async function XF(r,e=yD,t){const{appId:n,apiKey:s,measurementId:i}=r.options;if(!n)throw Ft.create("no-app-id");if(!s){if(i)return{measurementId:i,appId:n};throw Ft.create("no-api-key")}const o=e.getThrottleMetadata(n)||{backoffCount:0,throttleEndTimeMillis:Date.now()},a=new tL;return setTimeout(async()=>{a.abort()},LF),TD({appId:n,apiKey:s,measurementId:i},o,a,e)}async function TD(r,{throttleEndTimeMillis:e,backoffCount:t},n,s=yD){const{appId:i,measurementId:o}=r;try{await ZF(n,e)}catch(a){if(o)return ot.warn(`Timed out fetching this Firebase app's measurement ID from the server. Falling back to the measurement ID ${o} provided in the "measurementId" field in the local Firebase config. [${a?.message}]`),{appId:i,measurementId:o};throw a}try{const a=await YF(r);return s.deleteThrottleMetadata(i),a}catch(a){const c=a;if(!eL(c)){if(s.deleteThrottleMetadata(i),o)return ot.warn(`Failed to fetch this Firebase app's measurement ID from the server. Falling back to the measurement ID ${o} provided in the "measurementId" field in the local Firebase config. [${c?.message}]`),{appId:i,measurementId:o};throw a}const l=Number(c?.customData?.httpStatus)===503?np(t,s.intervalMillis,zF):np(t,s.intervalMillis),B={throttleEndTimeMillis:Date.now()+l,backoffCount:t+1};return s.setThrottleMetadata(i,B),ot.debug(`Calling attemptFetch again in ${l} millis`),TD(r,B,n,s)}}function ZF(r,e){return new Promise((t,n)=>{const s=Math.max(e-Date.now(),0),i=setTimeout(t,s);r.addEventListener(()=>{clearTimeout(i),n(Ft.create("fetch-throttle",{throttleEndTimeMillis:e}))})})}function eL(r){if(!(r instanceof xt)||!r.customData)return!1;const e=Number(r.customData.httpStatus);return e===429||e===500||e===503||e===504}class tL{constructor(){this.listeners=[]}addEventListener(e){this.listeners.push(e)}abort(){this.listeners.forEach(e=>e())}}async function nL(r,e,t,n,s){if(s&&s.global){r("event",t,n);return}else{const i=await e,o={...n,send_to:i};r("event",t,o)}}async function rL(r,e,t,n){{const s=await e;r("config",s,{update:!0,user_id:t})}}async function sL(r,e,t,n){if(n&&n.global){const s={};for(const i of Object.keys(t))s[`user_properties.${i}`]=t[i];return r("set",s),Promise.resolve()}else{const s=await e;r("config",s,{update:!0,user_properties:t})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function iL(){if(Yo())try{await ou()}catch(r){return ot.warn(Ft.create("indexeddb-unavailable",{errorInfo:r?.toString()}).message),!1}else return ot.warn(Ft.create("indexeddb-unavailable",{errorInfo:"IndexedDB is not available in this environment."}).message),!1;return!0}async function oL(r,e,t,n,s,i,o){const a=XF(r);a.then(p=>{t[p.measurementId]=p.appId,r.options.measurementId&&p.measurementId!==r.options.measurementId&&ot.warn(`The measurement ID in the local Firebase config (${r.options.measurementId}) does not match the measurement ID fetched from the server (${p.measurementId}). To ensure analytics events are always sent to the correct Analytics property, update the measurement ID field in the local config or remove it from the local config.`)}).catch(p=>ot.error(p)),e.push(a);const c=iL().then(p=>{if(p)return n.getId()}),[l,B]=await Promise.all([a,c]);JF(i)||GF(i,l.measurementId),s("js",new Date);const f=o?.config??{};return f[FF]="firebase",f.update=!0,B!=null&&(f[OF]=B),s("config",l.measurementId,f),l.measurementId}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class aL{constructor(e){this.app=e}_delete(){return delete as[this.app.options.appId],Promise.resolve()}}let as={},Og=[];const Fg={};let Gl="dataLayer",cL="gtag",Lg,qu,kg=!1;function uL(){const r=[];if(JB()&&r.push("This is a browser extension environment."),zB()||r.push("Cookies are not available."),r.length>0){const e=r.map((n,s)=>`(${s+1}) ${n}`).join(" "),t=Ft.create("invalid-analytics-context",{errorInfo:e});ot.warn(t.message)}}function lL(r,e,t){uL();const n=r.options.appId;if(!n)throw Ft.create("no-app-id");if(!r.options.apiKey)if(r.options.measurementId)ot.warn(`The "apiKey" field is empty in the local Firebase config. This is needed to fetch the latest measurement ID for this Firebase app. Falling back to the measurement ID ${r.options.measurementId} provided in the "measurementId" field in the local Firebase config.`);else throw Ft.create("no-api-key");if(as[n]!=null)throw Ft.create("already-exists",{id:n});if(!kg){UF(Gl);const{wrappedGtag:i,gtagCore:o}=KF(as,Og,Fg,Gl,cL);qu=i,Lg=o,kg=!0}return as[n]=oL(r,Og,Fg,e,Lg,Gl,t),new aL(r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Vx(r=ea()){r=ce(r);const e=Zt(r,ru);return e.isInitialized()?e.getImmediate():BL(r)}function BL(r,e={}){const t=Zt(r,ru);if(t.isInitialized()){const s=t.getImmediate();if(Cr(e,t.getOptions()))return s;throw Ft.create("already-initialized")}return t.initialize({options:e})}async function Mx(){if(JB()||!zB()||!Yo())return!1;try{return await ou()}catch{return!1}}function Gx(r,e,t){r=ce(r),rL(qu,as[r.app.options.appId],e).catch(n=>ot.error(n))}function hL(r,e,t){r=ce(r),sL(qu,as[r.app.options.appId],e,t).catch(n=>ot.error(n))}function fL(r,e,t,n){r=ce(r),nL(qu,as[r.app.options.appId],e,t,n).catch(s=>ot.error(s))}const xg="@firebase/analytics",Vg="0.10.25";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function dL(){Lt(new Dt(ru,(e,{options:t})=>{const n=e.getProvider("app").getImmediate(),s=e.getProvider("installations-internal").getImmediate();return lL(n,s,t)},"PUBLIC")),Lt(new Dt("analytics-internal",r,"PRIVATE")),Qe(xg,Vg),Qe(xg,Vg,"esm2020");function r(e){try{const t=e.getProvider(ru).getImmediate();return{logEvent:(n,s,i)=>fL(t,n,s,i),setUserProperties:(n,s)=>hL(t,n,s)}}catch(t){throw Ft.create("interop-component-reg-failed",{reason:t})}}}dL();var MB,Mg,ju=function(){var r=self.performance&&performance.getEntriesByType&&performance.getEntriesByType("navigation")[0];if(r&&r.responseStart>0&&r.responseStart<performance.now())return r},wD=function(r){if(document.readyState==="loading")return"loading";var e=ju();if(e){if(r<e.domInteractive)return"loading";if(e.domContentLoadedEventStart===0||r<e.domContentLoadedEventStart)return"dom-interactive";if(e.domComplete===0||r<e.domComplete)return"dom-content-loaded"}return"complete"},pL=function(r){var e=r.nodeName;return r.nodeType===1?e.toLowerCase():e.toUpperCase().replace(/^#/,"")},qf=function(r,e){var t="";try{for(;r&&r.nodeType!==9;){var n=r,s=n.id?"#"+n.id:pL(n)+(n.classList&&n.classList.value&&n.classList.value.trim()&&n.classList.value.trim().length?"."+n.classList.value.trim().replace(/\s+/g,"."):"");if(t.length+s.length>(e||100)-1)return t||s;if(t=t?s+">"+t:s,n.id)break;r=n.parentNode}}catch{}return t},AD=-1,CL=function(){return AD},Ia=function(r){addEventListener("pageshow",(function(e){e.persisted&&(AD=e.timeStamp,r(e))}),!0)},jf=function(){var r=ju();return r&&r.activationStart||0},wr=function(r,e){var t=ju(),n="navigate";return CL()>=0?n="back-forward-cache":t&&(document.prerendering||jf()>0?n="prerender":document.wasDiscarded?n="restore":t.type&&(n=t.type.replace(/_/g,"-"))),{name:r,value:e===void 0?-1:e,rating:"good",delta:0,entries:[],id:"v4-".concat(Date.now(),"-").concat(Math.floor(8999999999999*Math.random())+1e12),navigationType:n}},Oi=function(r,e,t){try{if(PerformanceObserver.supportedEntryTypes.includes(r)){var n=new PerformanceObserver((function(s){Promise.resolve().then((function(){e(s.getEntries())}))}));return n.observe(Object.assign({type:r,buffered:!0},t||{})),n}}catch{}},Ar=function(r,e,t,n){var s,i;return function(o){e.value>=0&&(o||n)&&((i=e.value-(s||0))||s===void 0)&&(s=e.value,e.delta=i,e.rating=(function(a,c){return a>c[1]?"poor":a>c[0]?"needs-improvement":"good"})(e.value,t),r(e))}},Kf=function(r){requestAnimationFrame((function(){return requestAnimationFrame((function(){return r()}))}))},Ku=function(r){document.addEventListener("visibilitychange",(function(){document.visibilityState==="hidden"&&r()}))},Jf=function(r){var e=!1;return function(){e||(r(),e=!0)}},Js=-1,Gg=function(){return document.visibilityState!=="hidden"||document.prerendering?1/0:0},su=function(r){document.visibilityState==="hidden"&&Js>-1&&(Js=r.type==="visibilitychange"?r.timeStamp:0,gL())},Ug=function(){addEventListener("visibilitychange",su,!0),addEventListener("prerenderingchange",su,!0)},gL=function(){removeEventListener("visibilitychange",su,!0),removeEventListener("prerenderingchange",su,!0)},vD=function(){return Js<0&&(Js=Gg(),Ug(),Ia((function(){setTimeout((function(){Js=Gg(),Ug()}),0)}))),{get firstHiddenTime(){return Js}}},zf=function(r){document.prerendering?addEventListener("prerenderingchange",(function(){return r()}),!0):r()},Hg=[1800,3e3],mL=function(r,e){e=e||{},zf((function(){var t,n=vD(),s=wr("FCP"),i=Oi("paint",(function(o){o.forEach((function(a){a.name==="first-contentful-paint"&&(i.disconnect(),a.startTime<n.firstHiddenTime&&(s.value=Math.max(a.startTime-jf(),0),s.entries.push(a),t(!0)))}))}));i&&(t=Ar(r,s,Hg,e.reportAllChanges),Ia((function(o){s=wr("FCP"),t=Ar(r,s,Hg,e.reportAllChanges),Kf((function(){s.value=performance.now()-o.timeStamp,t(!0)}))})))}))},qg=[.1,.25],_L=function(r,e){(function(t,n){n=n||{},mL(Jf((function(){var s,i=wr("CLS",0),o=0,a=[],c=function(B){B.forEach((function(f){if(!f.hadRecentInput){var p=a[0],m=a[a.length-1];o&&f.startTime-m.startTime<1e3&&f.startTime-p.startTime<5e3?(o+=f.value,a.push(f)):(o=f.value,a=[f])}})),o>i.value&&(i.value=o,i.entries=a,s())},l=Oi("layout-shift",c);l&&(s=Ar(t,i,qg,n.reportAllChanges),Ku((function(){c(l.takeRecords()),s(!0)})),Ia((function(){o=0,i=wr("CLS",0),s=Ar(t,i,qg,n.reportAllChanges),Kf((function(){return s()}))})),setTimeout(s,0))})))})((function(t){var n=(function(s){var i,o={};if(s.entries.length){var a=s.entries.reduce((function(l,B){return l&&l.value>B.value?l:B}));if(a&&a.sources&&a.sources.length){var c=(i=a.sources).find((function(l){return l.node&&l.node.nodeType===1}))||i[0];c&&(o={largestShiftTarget:qf(c.node),largestShiftTime:a.startTime,largestShiftValue:a.value,largestShiftSource:c,largestShiftEntry:a,loadState:wD(a.startTime)})}}return Object.assign(s,{attribution:o})})(t);r(n)}),e)},RD=0,Ul=1/0,ec=0,EL=function(r){r.forEach((function(e){e.interactionId&&(Ul=Math.min(Ul,e.interactionId),ec=Math.max(ec,e.interactionId),RD=ec?(ec-Ul)/7+1:0)}))},bD=function(){return MB?RD:performance.interactionCount||0},IL=function(){"interactionCount"in performance||MB||(MB=Oi("event",EL,{type:"event",buffered:!0,durationThreshold:0}))},Qt=[],Ao=new Map,SD=0,DL=function(){var r=Math.min(Qt.length-1,Math.floor((bD()-SD)/50));return Qt[r]},PD=[],yL=function(r){if(PD.forEach((function(s){return s(r)})),r.interactionId||r.entryType==="first-input"){var e=Qt[Qt.length-1],t=Ao.get(r.interactionId);if(t||Qt.length<10||r.duration>e.latency){if(t)r.duration>t.latency?(t.entries=[r],t.latency=r.duration):r.duration===t.latency&&r.startTime===t.entries[0].startTime&&t.entries.push(r);else{var n={id:r.interactionId,latency:r.duration,entries:[r]};Ao.set(n.id,n),Qt.push(n)}Qt.sort((function(s,i){return i.latency-s.latency})),Qt.length>10&&Qt.splice(10).forEach((function(s){return Ao.delete(s.id)}))}}},$f=function(r){var e=self.requestIdleCallback||self.setTimeout,t=-1;return r=Jf(r),document.visibilityState==="hidden"?r():(t=e(r),Ku(r)),t},jg=[200,500],TL=function(r,e){"PerformanceEventTiming"in self&&"interactionId"in PerformanceEventTiming.prototype&&(e=e||{},zf((function(){var t;IL();var n,s=wr("INP"),i=function(a){$f((function(){a.forEach(yL);var c=DL();c&&c.latency!==s.value&&(s.value=c.latency,s.entries=c.entries,n())}))},o=Oi("event",i,{durationThreshold:(t=e.durationThreshold)!==null&&t!==void 0?t:40});n=Ar(r,s,jg,e.reportAllChanges),o&&(o.observe({type:"first-input",buffered:!0}),Ku((function(){i(o.takeRecords()),n(!0)})),Ia((function(){SD=bD(),Qt.length=0,Ao.clear(),s=wr("INP"),n=Ar(r,s,jg,e.reportAllChanges)})))})))},Ws=[],cr=[],GB=0,Qf=new WeakMap,Ys=new Map,UB=-1,wL=function(r){Ws=Ws.concat(r),ND()},ND=function(){UB<0&&(UB=$f(AL))},AL=function(){Ys.size>10&&Ys.forEach((function(o,a){Ao.has(a)||Ys.delete(a)}));var r=Qt.map((function(o){return Qf.get(o.entries[0])})),e=cr.length-50;cr=cr.filter((function(o,a){return a>=e||r.includes(o)}));for(var t=new Set,n=0;n<cr.length;n++){var s=cr[n];OD(s.startTime,s.processingEnd).forEach((function(o){t.add(o)}))}var i=Ws.length-1-50;Ws=Ws.filter((function(o,a){return o.startTime>GB&&a>i||t.has(o)})),UB=-1};PD.push((function(r){r.interactionId&&r.target&&!Ys.has(r.interactionId)&&Ys.set(r.interactionId,r.target)}),(function(r){var e,t=r.startTime+r.duration;GB=Math.max(GB,r.processingEnd);for(var n=cr.length-1;n>=0;n--){var s=cr[n];if(Math.abs(t-s.renderTime)<=8){(e=s).startTime=Math.min(r.startTime,e.startTime),e.processingStart=Math.min(r.processingStart,e.processingStart),e.processingEnd=Math.max(r.processingEnd,e.processingEnd),e.entries.push(r);break}}e||(e={startTime:r.startTime,processingStart:r.processingStart,processingEnd:r.processingEnd,renderTime:t,entries:[r]},cr.push(e)),(r.interactionId||r.entryType==="first-input")&&Qf.set(r,e),ND()}));var OD=function(r,e){for(var t,n=[],s=0;t=Ws[s];s++)if(!(t.startTime+t.duration<r)){if(t.startTime>e)break;n.push(t)}return n},vL=function(r,e){Mg||(Mg=Oi("long-animation-frame",wL)),TL((function(t){var n=(function(s){var i=s.entries[0],o=Qf.get(i),a=i.processingStart,c=o.processingEnd,l=o.entries.sort((function(V,j){return V.processingStart-j.processingStart})),B=OD(i.startTime,c),f=s.entries.find((function(V){return V.target})),p=f&&f.target||Ys.get(i.interactionId),m=[i.startTime+i.duration,c].concat(B.map((function(V){return V.startTime+V.duration}))),y=Math.max.apply(Math,m),F={interactionTarget:qf(p),interactionTargetElement:p,interactionType:i.name.startsWith("key")?"keyboard":"pointer",interactionTime:i.startTime,nextPaintTime:y,processedEventEntries:l,longAnimationFrameEntries:B,inputDelay:a-i.startTime,processingDuration:c-a,presentationDelay:Math.max(y-c,0),loadState:wD(i.startTime)};return Object.assign(s,{attribution:F})})(t);r(n)}),e)},Kg=[2500,4e3],Hl={},RL=function(r,e){(function(t,n){n=n||{},zf((function(){var s,i=vD(),o=wr("LCP"),a=function(B){n.reportAllChanges||(B=B.slice(-1)),B.forEach((function(f){f.startTime<i.firstHiddenTime&&(o.value=Math.max(f.startTime-jf(),0),o.entries=[f],s())}))},c=Oi("largest-contentful-paint",a);if(c){s=Ar(t,o,Kg,n.reportAllChanges);var l=Jf((function(){Hl[o.id]||(a(c.takeRecords()),c.disconnect(),Hl[o.id]=!0,s(!0))}));["keydown","click"].forEach((function(B){addEventListener(B,(function(){return $f(l)}),{once:!0,capture:!0})})),Ku(l),Ia((function(B){o=wr("LCP"),s=Ar(t,o,Kg,n.reportAllChanges),Kf((function(){o.value=performance.now()-B.timeStamp,Hl[o.id]=!0,s(!0)}))}))}}))})((function(t){var n=(function(s){var i={timeToFirstByte:0,resourceLoadDelay:0,resourceLoadDuration:0,elementRenderDelay:s.value};if(s.entries.length){var o=ju();if(o){var a=o.activationStart||0,c=s.entries[s.entries.length-1],l=c.url&&performance.getEntriesByType("resource").filter((function(y){return y.name===c.url}))[0],B=Math.max(0,o.responseStart-a),f=Math.max(B,l?(l.requestStart||l.startTime)-a:0),p=Math.max(f,l?l.responseEnd-a:0),m=Math.max(p,c.startTime-a);i={element:qf(c.element),timeToFirstByte:B,resourceLoadDelay:f-B,resourceLoadDuration:p-f,elementRenderDelay:m-p,navigationEntry:o,lcpEntry:c},c.url&&(i.url=c.url),l&&(i.lcpResourceEntry=l)}}return Object.assign(s,{attribution:i})})(t);r(n)}),e)};const Jg="@firebase/performance",HB="0.7.14";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const FD=HB,bL="FB-PERF-TRACE-START",SL="FB-PERF-TRACE-STOP",qB="FB-PERF-TRACE-MEASURE",LD="_wt_",kD="_fp",xD="_fcp",VD="_fid",MD="_lcp",PL="lcp_element",GD="_inp",NL="inp_interactionTarget",UD="_cls",OL="cls_largestShiftTarget",HD="@firebase/performance/config",qD="@firebase/performance/configexpire",FL="performance",jD="Performance";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const LL={"trace started":"Trace {$traceName} was started before.","trace stopped":"Trace {$traceName} is not running.","nonpositive trace startTime":"Trace {$traceName} startTime should be positive.","nonpositive trace duration":"Trace {$traceName} duration should be positive.","no window":"Window is not available.","no app id":"App id is not available.","no project id":"Project id is not available.","no api key":"Api key is not available.","invalid cc log":"Attempted to queue invalid cc event","FB not default":"Performance can only start when Firebase app instance is the default one.","RC response not ok":"RC response is not ok","invalid attribute name":"Attribute name {$attributeName} is invalid.","invalid attribute value":"Attribute value {$attributeValue} is invalid.","invalid custom metric name":"Custom metric name {$customMetricName} is invalid","invalid String merger input":"Input for String merger is invalid, contact support team to resolve.","already initialized":"initializePerformance() has already been called with different options. To avoid this error, call initializePerformance() with the same options as when it was originally called, or call getPerformance() to return the already initialized instance."},rt=new vr(FL,jD,LL);/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const xn=new Zo(jD);xn.logLevel=Be.INFO;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let ql,KD;class Ue{constructor(e){if(this.window=e,!e)throw rt.create("no window");this.performance=e.performance,this.PerformanceObserver=e.PerformanceObserver,this.windowLocation=e.location,this.navigator=e.navigator,this.document=e.document,this.navigator&&this.navigator.cookieEnabled&&(this.localStorage=e.localStorage),e.perfMetrics&&e.perfMetrics.onFirstInputDelay&&(this.onFirstInputDelay=e.perfMetrics.onFirstInputDelay),this.onLCP=RL,this.onINP=vL,this.onCLS=_L}getUrl(){return this.windowLocation.href.split("?")[0]}mark(e){!this.performance||!this.performance.mark||this.performance.mark(e)}measure(e,t,n){!this.performance||!this.performance.measure||this.performance.measure(e,t,n)}getEntriesByType(e){return!this.performance||!this.performance.getEntriesByType?[]:this.performance.getEntriesByType(e)}getEntriesByName(e){return!this.performance||!this.performance.getEntriesByName?[]:this.performance.getEntriesByName(e)}getTimeOrigin(){return this.performance&&(this.performance.timeOrigin||this.performance.timing.navigationStart)}requiredApisAvailable(){return!fetch||!Promise||!zB()?(xn.info("Firebase Performance cannot start if browser does not support fetch and Promise or cookie is disabled."),!1):Yo()?!0:(xn.info("IndexedDB is not supported by current browser"),!1)}setupObserver(e,t){if(!this.PerformanceObserver)return;new this.PerformanceObserver(s=>{for(const i of s.getEntries())t(i)}).observe({entryTypes:[e]})}static getInstance(){return ql===void 0&&(ql=new Ue(KD)),ql}}function kL(r){KD=r}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let JD;function xL(r){const e=r.getId();return e.then(t=>{JD=t}),e}function Wf(){return JD}function VL(r){const e=r.getToken();return e.then(t=>{}),e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function zg(r,e){const t=r.length-e.length;if(t<0||t>1)throw rt.create("invalid String merger input");const n=[];for(let s=0;s<r.length;s++)n.push(r.charAt(s)),e.length>s&&n.push(e.charAt(s));return n.join("")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let jl;class ft{constructor(){this.instrumentationEnabled=!0,this.dataCollectionEnabled=!0,this.loggingEnabled=!1,this.tracesSamplingRate=1,this.networkRequestsSamplingRate=1,this.logEndPointUrl="https://firebaselogging.googleapis.com/v0cc/log?format=json_proto",this.flTransportEndpointUrl=zg("hts/frbslgigp.ogepscmv/ieo/eaylg","tp:/ieaeogn-agolai.o/1frlglgc/o"),this.transportKey=zg("AzSC8r6ReiGqFMyfvgow","Iayx0u-XT3vksVM-pIV"),this.logSource=462,this.logTraceAfterSampling=!1,this.logNetworkAfterSampling=!1,this.configTimeToLive=12,this.logMaxFlushSize=40}getFlTransportFullUrl(){return this.flTransportEndpointUrl.concat("?key=",this.transportKey)}static getInstance(){return jl===void 0&&(jl=new ft),jl}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var vo;(function(r){r[r.UNKNOWN=0]="UNKNOWN",r[r.VISIBLE=1]="VISIBLE",r[r.HIDDEN=2]="HIDDEN"})(vo||(vo={}));const ML=["firebase_","google_","ga_"],GL=new RegExp("^[a-zA-Z]\\w*$"),UL=40,jB=100;function HL(){const r=Ue.getInstance().navigator;return r?.serviceWorker?r.serviceWorker.controller?2:3:1}function qL(){switch(Ue.getInstance().document.visibilityState){case"visible":return vo.VISIBLE;case"hidden":return vo.HIDDEN;default:return vo.UNKNOWN}}function jL(){const e=Ue.getInstance().navigator.connection;switch(e&&e.effectiveType){case"slow-2g":return 1;case"2g":return 2;case"3g":return 3;case"4g":return 4;default:return 0}}function KL(r){return r.length===0||r.length>UL?!1:!ML.some(t=>r.startsWith(t))&&!!r.match(GL)}function JL(r){return r.length!==0&&r.length<=jB}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function zD(r){const e=r.options?.appId;if(!e)throw rt.create("no app id");return e}function zL(r){const e=r.options?.projectId;if(!e)throw rt.create("no project id");return e}function $L(r){const e=r.options?.apiKey;if(!e)throw rt.create("no api key");return e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const QL="0.0.1",At={loggingEnabled:!0},WL="FIREBASE_INSTALLATIONS_AUTH";function YL(r,e){const t=XL();return t?($g(t),Promise.resolve()):tk(r,e).then($g).then(n=>ZL(n),()=>{})}function XL(){const r=Ue.getInstance().localStorage;if(!r)return;const e=r.getItem(qD);if(!e||!nk(e))return;const t=r.getItem(HD);if(t)try{return JSON.parse(t)}catch{return}}function ZL(r){const e=Ue.getInstance().localStorage;!r||!e||(e.setItem(HD,JSON.stringify(r)),e.setItem(qD,String(Date.now()+ft.getInstance().configTimeToLive*60*60*1e3)))}const ek="Could not fetch config, will use default configs";function tk(r,e){return VL(r.installations).then(t=>{const n=zL(r.app),s=$L(r.app),i=`https://firebaseremoteconfig.googleapis.com/v1/projects/${n}/namespaces/fireperf:fetch?key=${s}`,o=new Request(i,{method:"POST",headers:{Authorization:`${WL} ${t}`},body:JSON.stringify({app_instance_id:e,app_instance_id_token:t,app_id:zD(r.app),app_version:FD,sdk_version:QL})});return fetch(o).then(a=>{if(a.ok)return a.json();throw rt.create("RC response not ok")})}).catch(()=>{xn.info(ek)})}function $g(r){if(!r)return r;const e=ft.getInstance(),t=r.entries||{};return t.fpr_enabled!==void 0?e.loggingEnabled=String(t.fpr_enabled)==="true":e.loggingEnabled=At.loggingEnabled,t.fpr_log_source?e.logSource=Number(t.fpr_log_source):At.logSource&&(e.logSource=At.logSource),t.fpr_log_endpoint_url?e.logEndPointUrl=t.fpr_log_endpoint_url:At.logEndPointUrl&&(e.logEndPointUrl=At.logEndPointUrl),t.fpr_log_transport_key?e.transportKey=t.fpr_log_transport_key:At.transportKey&&(e.transportKey=At.transportKey),t.fpr_vc_network_request_sampling_rate!==void 0?e.networkRequestsSamplingRate=Number(t.fpr_vc_network_request_sampling_rate):At.networkRequestsSamplingRate!==void 0&&(e.networkRequestsSamplingRate=At.networkRequestsSamplingRate),t.fpr_vc_trace_sampling_rate!==void 0?e.tracesSamplingRate=Number(t.fpr_vc_trace_sampling_rate):At.tracesSamplingRate!==void 0&&(e.tracesSamplingRate=At.tracesSamplingRate),t.fpr_log_max_flush_size?e.logMaxFlushSize=Number(t.fpr_log_max_flush_size):At.logMaxFlushSize&&(e.logMaxFlushSize=At.logMaxFlushSize),e.logTraceAfterSampling=Qg(e.tracesSamplingRate),e.logNetworkAfterSampling=Qg(e.networkRequestsSamplingRate),r}function nk(r){return Number(r)>Date.now()}function Qg(r){return Math.random()<=r}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Yf=1,Kl;function $D(r){return Yf=2,Kl=Kl||sk(r),Kl}function rk(){return Yf===3}function sk(r){return ik().then(()=>xL(r.installations)).then(e=>YL(r,e)).then(()=>Wg(),()=>Wg())}function ik(){const r=Ue.getInstance().document;return new Promise(e=>{if(r&&r.readyState!=="complete"){const t=()=>{r.readyState==="complete"&&(r.removeEventListener("readystatechange",t),e())};r.addEventListener("readystatechange",t)}else e()})}function Wg(){Yf=3}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const QD=10*1e3,ok=5.5*1e3,ak=1e3,WD=3,ck=65536,uk=new TextEncoder;let Ec=WD,Ut=[],Yg=!1;function lk(){Yg||(Xf(ok),Yg=!0)}function Xf(r){setTimeout(()=>{Ec<=0||(Ut.length>0&&Bk(),Xf(QD))},r)}function Bk(){const r=Ut.splice(0,ak),e=KB(r);hk(e).then(()=>{Ec=WD}).catch(()=>{Ut=[...r,...Ut],Ec--,xn.info(`Tries left: ${Ec}.`),Xf(QD)})}function KB(r){const e=r.map(n=>({source_extension_json_proto3:n.message,event_time_ms:String(n.eventTime)})),t={request_time_ms:String(Date.now()),client_info:{client_type:1,js_client_info:{}},log_source:ft.getInstance().logSource,log_event:e};return JSON.stringify(t)}function hk(r){const e=ft.getInstance().getFlTransportFullUrl();return uk.encode(r).length<=ck&&navigator.sendBeacon&&navigator.sendBeacon(e,r)?Promise.resolve():fetch(e,{method:"POST",body:r})}function fk(r){if(!r.eventTime||!r.message)throw rt.create("invalid cc log");Ut=[...Ut,r]}function dk(r){return(...e)=>{const t=r(...e);fk({message:t,eventTime:Date.now()})}}function pk(){const r=ft.getInstance().getFlTransportFullUrl();for(;Ut.length>0;){const e=Ut.splice(-ft.getInstance().logMaxFlushSize),t=KB(e);if(!(navigator.sendBeacon&&navigator.sendBeacon(r,t))){Ut=[...Ut,...e];break}}if(Ut.length>0){const e=KB(Ut);fetch(r,{method:"POST",body:e}).catch(()=>{xn.info("Failed flushing queued events.")})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Ro;function YD(r,e){Ro||(Ro={send:dk(mk),flush:pk}),Ro.send(r,e)}function tc(r){const e=ft.getInstance();!e.instrumentationEnabled&&r.isAuto||!e.dataCollectionEnabled&&!r.isAuto||Ue.getInstance().requiredApisAvailable()&&(rk()?Jl(r):$D(r.performanceController).then(()=>Jl(r),()=>Jl(r)))}function Ck(){Ro&&Ro.flush()}function Jl(r){if(!Wf())return;const e=ft.getInstance();!e.loggingEnabled||!e.logTraceAfterSampling||YD(r,1)}function gk(r){const e=ft.getInstance();if(!e.instrumentationEnabled)return;const t=r.url,n=e.logEndPointUrl.split("?")[0],s=e.flTransportEndpointUrl.split("?")[0];t===n||t===s||!e.loggingEnabled||!e.logNetworkAfterSampling||YD(r,0)}function mk(r,e){return e===0?_k(r):Ek(r)}function _k(r){const e={url:r.url,http_method:r.httpMethod||0,http_response_code:200,response_payload_bytes:r.responsePayloadBytes,client_start_time_us:r.startTimeUs,time_to_response_initiated_us:r.timeToResponseInitiatedUs,time_to_response_completed_us:r.timeToResponseCompletedUs},t={application_info:XD(r.performanceController.app),network_request_metric:e};return JSON.stringify(t)}function Ek(r){const e={name:r.name,is_auto:r.isAuto,client_start_time_us:r.startTimeUs,duration_us:r.durationUs};Object.keys(r.counters).length!==0&&(e.counters=r.counters);const t=r.getAttributes();Object.keys(t).length!==0&&(e.custom_attributes=t);const n={application_info:XD(r.performanceController.app),trace_metric:e};return JSON.stringify(n)}function XD(r){return{google_app_id:zD(r),app_instance_id:Wf(),web_app_info:{sdk_version:FD,page_url:Ue.getInstance().getUrl(),service_worker_status:HL(),visibility_state:qL(),effective_connection_type:jL()},application_process_state:0}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Xg(r,e){const t=e;if(!t||t.responseStart===void 0)return;const n=Ue.getInstance().getTimeOrigin(),s=Math.floor((t.startTime+n)*1e3),i=t.responseStart?Math.floor((t.responseStart-t.startTime)*1e3):void 0,o=Math.floor((t.responseEnd-t.startTime)*1e3),a=t.name&&t.name.split("?")[0],c={performanceController:r,url:a,responsePayloadBytes:t.transferSize,startTimeUs:s,timeToResponseInitiatedUs:i,timeToResponseCompletedUs:o};gk(c)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ik=100,Dk="_",yk=[kD,xD,VD,MD,UD,GD];function Tk(r,e){return r.length===0||r.length>Ik?!1:e&&e.startsWith(LD)&&yk.indexOf(r)>-1||!r.startsWith(Dk)}function wk(r){const e=Math.floor(r);return e<r&&xn.info(`Metric value should be an Integer, setting the value as : ${e}.`),e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Wo{constructor(e,t,n=!1,s){this.performanceController=e,this.name=t,this.isAuto=n,this.state=1,this.customAttributes={},this.counters={},this.api=Ue.getInstance(),this.randomId=Math.floor(Math.random()*1e6),this.isAuto||(this.traceStartMark=`${bL}-${this.randomId}-${this.name}`,this.traceStopMark=`${SL}-${this.randomId}-${this.name}`,this.traceMeasure=s||`${qB}-${this.randomId}-${this.name}`,s&&this.calculateTraceMetrics())}start(){if(this.state!==1)throw rt.create("trace started",{traceName:this.name});this.api.mark(this.traceStartMark),this.state=2}stop(){if(this.state!==2)throw rt.create("trace stopped",{traceName:this.name});this.state=3,this.api.mark(this.traceStopMark),this.api.measure(this.traceMeasure,this.traceStartMark,this.traceStopMark),this.calculateTraceMetrics(),tc(this)}record(e,t,n){if(e<=0)throw rt.create("nonpositive trace startTime",{traceName:this.name});if(t<=0)throw rt.create("nonpositive trace duration",{traceName:this.name});if(this.durationUs=Math.floor(t*1e3),this.startTimeUs=Math.floor(e*1e3),n&&n.attributes&&(this.customAttributes={...n.attributes}),n&&n.metrics)for(const s of Object.keys(n.metrics))isNaN(Number(n.metrics[s]))||(this.counters[s]=Math.floor(Number(n.metrics[s])));tc(this)}incrementMetric(e,t=1){this.counters[e]===void 0?this.putMetric(e,t):this.putMetric(e,this.counters[e]+t)}putMetric(e,t){if(Tk(e,this.name))this.counters[e]=wk(t??0);else throw rt.create("invalid custom metric name",{customMetricName:e})}getMetric(e){return this.counters[e]||0}putAttribute(e,t){const n=KL(e),s=JL(t);if(n&&s){this.customAttributes[e]=t;return}if(!n)throw rt.create("invalid attribute name",{attributeName:e});if(!s)throw rt.create("invalid attribute value",{attributeValue:t})}getAttribute(e){return this.customAttributes[e]}removeAttribute(e){this.customAttributes[e]!==void 0&&delete this.customAttributes[e]}getAttributes(){return{...this.customAttributes}}setStartTime(e){this.startTimeUs=e}setDuration(e){this.durationUs=e}calculateTraceMetrics(){const e=this.api.getEntriesByName(this.traceMeasure),t=e&&e[0];t&&(this.durationUs=Math.floor(t.duration*1e3),this.startTimeUs=Math.floor((t.startTime+this.api.getTimeOrigin())*1e3))}static createOobTrace(e,t,n,s,i){const o=Ue.getInstance().getUrl();if(!o)return;const a=new Wo(e,LD+o,!0),c=Math.floor(Ue.getInstance().getTimeOrigin()*1e3);a.setStartTime(c),t&&t[0]&&(a.setDuration(Math.floor(t[0].duration*1e3)),a.putMetric("domInteractive",Math.floor(t[0].domInteractive*1e3)),a.putMetric("domContentLoadedEventEnd",Math.floor(t[0].domContentLoadedEventEnd*1e3)),a.putMetric("loadEventEnd",Math.floor(t[0].loadEventEnd*1e3)));const l="first-paint",B="first-contentful-paint";if(n){const f=n.find(m=>m.name===l);f&&f.startTime&&a.putMetric(kD,Math.floor(f.startTime*1e3));const p=n.find(m=>m.name===B);p&&p.startTime&&a.putMetric(xD,Math.floor(p.startTime*1e3)),i&&a.putMetric(VD,Math.floor(i*1e3))}this.addWebVitalMetric(a,MD,PL,s.lcp),this.addWebVitalMetric(a,UD,OL,s.cls),this.addWebVitalMetric(a,GD,NL,s.inp),tc(a),Ck()}static addWebVitalMetric(e,t,n,s){s&&(e.putMetric(t,Math.floor(s.value*1e3)),s.elementAttribution&&(s.elementAttribution.length>jB?e.putAttribute(n,s.elementAttribution.substring(0,jB)):e.putAttribute(n,s.elementAttribution)))}static createUserTimingTrace(e,t){const n=new Wo(e,t,!1,t);tc(n)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Ic={},Zg=!1,ZD;function em(r){Wf()&&(setTimeout(()=>vk(r),0),setTimeout(()=>Ak(r),0),setTimeout(()=>Rk(r),0))}function Ak(r){const e=Ue.getInstance(),t=e.getEntriesByType("resource");for(const n of t)Xg(r,n);e.setupObserver("resource",n=>Xg(r,n))}function vk(r){const e=Ue.getInstance();"onpagehide"in window?e.document.addEventListener("pagehide",()=>zl(r)):e.document.addEventListener("unload",()=>zl(r)),e.document.addEventListener("visibilitychange",()=>{e.document.visibilityState==="hidden"&&zl(r)}),e.onFirstInputDelay&&e.onFirstInputDelay(t=>{ZD=t}),e.onLCP(t=>{Ic.lcp={value:t.value,elementAttribution:t.attribution?.element}}),e.onCLS(t=>{Ic.cls={value:t.value,elementAttribution:t.attribution?.largestShiftTarget}}),e.onINP(t=>{Ic.inp={value:t.value,elementAttribution:t.attribution?.interactionTarget}})}function Rk(r){const e=Ue.getInstance(),t=e.getEntriesByType("measure");for(const n of t)tm(r,n);e.setupObserver("measure",n=>tm(r,n))}function tm(r,e){const t=e.name;t.substring(0,qB.length)!==qB&&Wo.createUserTimingTrace(r,t)}function zl(r){if(!Zg){Zg=!0;const e=Ue.getInstance(),t=e.getEntriesByType("navigation"),n=e.getEntriesByType("paint");setTimeout(()=>{Wo.createOobTrace(r,t,n,Ic,ZD)},0)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class bk{constructor(e,t){this.app=e,this.installations=t,this.initialized=!1}_init(e){this.initialized||(e?.dataCollectionEnabled!==void 0&&(this.dataCollectionEnabled=e.dataCollectionEnabled),e?.instrumentationEnabled!==void 0&&(this.instrumentationEnabled=e.instrumentationEnabled),Ue.getInstance().requiredApisAvailable()?ou().then(t=>{t&&(lk(),$D(this).then(()=>em(this),()=>em(this)),this.initialized=!0)}).catch(t=>{xn.info(`Environment doesn't support IndexedDB: ${t}`)}):xn.info('Firebase Performance cannot start if the browser does not support "Fetch" and "Promise", or cookies are disabled.'))}set instrumentationEnabled(e){ft.getInstance().instrumentationEnabled=e}get instrumentationEnabled(){return ft.getInstance().instrumentationEnabled}set dataCollectionEnabled(e){ft.getInstance().dataCollectionEnabled=e}get dataCollectionEnabled(){return ft.getInstance().dataCollectionEnabled}}const Sk="[DEFAULT]";function Ux(r=ea()){return r=ce(r),Zt(r,"performance").getImmediate()}const Pk=(r,{options:e})=>{const t=r.getProvider("app").getImmediate(),n=r.getProvider("installations-internal").getImmediate();if(t.name!==Sk)throw rt.create("FB not default");if(typeof window>"u")throw rt.create("no window");kL(window);const s=new bk(t,n);return s._init(e),s};function Nk(){Lt(new Dt("performance",Pk,"PUBLIC")),Qe(Jg,HB),Qe(Jg,HB,"esm2020")}Nk();export{ox as A,kk as B,fx as C,px as D,Cx as E,Gx as F,hL as G,fL as H,mx as I,ax as J,ix as K,_x as L,Fx as M,Px as N,Nx as O,Ox as P,Bx as Q,Vk as R,gx as S,ge as T,xk as U,Ix as V,Dx as W,Ex as X,tx as a,Lx as b,kx as c,Mx as d,Vx as e,Ux as f,Sx as g,ux as h,XT as i,nx as j,c0 as k,yx as l,wx as m,Tx as n,bx as o,cx as p,xx as q,mP as r,vx as s,rx as t,Ax as u,Rx as v,hx as w,ov as x,dx as y,sx as z};
