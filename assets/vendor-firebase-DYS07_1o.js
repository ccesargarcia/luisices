const aT=()=>{};var _d={};/**
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
 */const Yp=function(n){const e=[];let t=0;for(let r=0;r<n.length;r++){let i=n.charCodeAt(r);i<128?e[t++]=i:i<2048?(e[t++]=i>>6|192,e[t++]=i&63|128):(i&64512)===55296&&r+1<n.length&&(n.charCodeAt(r+1)&64512)===56320?(i=65536+((i&1023)<<10)+(n.charCodeAt(++r)&1023),e[t++]=i>>18|240,e[t++]=i>>12&63|128,e[t++]=i>>6&63|128,e[t++]=i&63|128):(e[t++]=i>>12|224,e[t++]=i>>6&63|128,e[t++]=i&63|128)}return e},cT=function(n){const e=[];let t=0,r=0;for(;t<n.length;){const i=n[t++];if(i<128)e[r++]=String.fromCharCode(i);else if(i>191&&i<224){const s=n[t++];e[r++]=String.fromCharCode((i&31)<<6|s&63)}else if(i>239&&i<365){const s=n[t++],o=n[t++],c=n[t++],u=((i&7)<<18|(s&63)<<12|(o&63)<<6|c&63)-65536;e[r++]=String.fromCharCode(55296+(u>>10)),e[r++]=String.fromCharCode(56320+(u&1023))}else{const s=n[t++],o=n[t++];e[r++]=String.fromCharCode((i&15)<<12|(s&63)<<6|o&63)}}return e.join("")},Xp={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(n,e){if(!Array.isArray(n))throw Error("encodeByteArray takes an array as a parameter");this.init_();const t=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,r=[];for(let i=0;i<n.length;i+=3){const s=n[i],o=i+1<n.length,c=o?n[i+1]:0,u=i+2<n.length,l=u?n[i+2]:0,f=s>>2,p=(s&3)<<4|c>>4;let g=(c&15)<<2|l>>6,A=l&63;u||(A=64,o||(g=64)),r.push(t[f],t[p],t[g],t[A])}return r.join("")},encodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(n):this.encodeByteArray(Yp(n),e)},decodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(n):cT(this.decodeStringToByteArray(n,e))},decodeStringToByteArray(n,e){this.init_();const t=e?this.charToByteMapWebSafe_:this.charToByteMap_,r=[];for(let i=0;i<n.length;){const s=t[n.charAt(i++)],c=i<n.length?t[n.charAt(i)]:0;++i;const l=i<n.length?t[n.charAt(i)]:64;++i;const p=i<n.length?t[n.charAt(i)]:64;if(++i,s==null||c==null||l==null||p==null)throw new uT;const g=s<<2|c>>4;if(r.push(g),l!==64){const A=c<<4&240|l>>2;if(r.push(A),p!==64){const C=l<<6&192|p;r.push(C)}}}return r},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let n=0;n<this.ENCODED_VALS.length;n++)this.byteToCharMap_[n]=this.ENCODED_VALS.charAt(n),this.charToByteMap_[this.byteToCharMap_[n]]=n,this.byteToCharMapWebSafe_[n]=this.ENCODED_VALS_WEBSAFE.charAt(n),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[n]]=n,n>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(n)]=n,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(n)]=n)}}};class uT extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const lT=function(n){const e=Yp(n);return Xp.encodeByteArray(e,!0)},Do=function(n){return lT(n).replace(/\./g,"")},Zp=function(n){try{return Xp.decodeString(n,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};/**
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
 */function em(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
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
 */const hT=()=>em().__FIREBASE_DEFAULTS__,dT=()=>{if(typeof process>"u"||typeof _d>"u")return;const n=_d.__FIREBASE_DEFAULTS__;if(n)return JSON.parse(n)},fT=()=>{if(typeof document>"u")return;let n;try{n=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=n&&Zp(n[1]);return e&&JSON.parse(e)},ca=()=>{try{return aT()||hT()||dT()||fT()}catch(n){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${n}`);return}},tm=n=>ca()?.emulatorHosts?.[n],nm=n=>{const e=tm(n);if(!e)return;const t=e.lastIndexOf(":");if(t<=0||t+1===e.length)throw new Error(`Invalid host ${e} with no separate hostname and port!`);const r=parseInt(e.substring(t+1),10);return e[0]==="["?[e.substring(1,t-1),r]:[e.substring(0,t),r]},rm=()=>ca()?.config,im=n=>ca()?.[`_${n}`];/**
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
 */class pT{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}wrapCallback(e){return(t,r)=>{t?this.reject(t):this.resolve(r),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(t):e(t,r))}}}/**
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
 */function bt(n){try{return(n.startsWith("http://")||n.startsWith("https://")?new URL(n).hostname:n).endsWith(".cloudworkstations.dev")}catch{return!1}}async function ua(n){return(await fetch(n,{credentials:"include"})).ok}/**
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
 */function mT(n,e){if(n.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const t={alg:"none",type:"JWT"},r=e||"demo-project",i=n.iat||0,s=n.sub||n.user_id;if(!s)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const o={iss:`https://securetoken.google.com/${r}`,aud:r,iat:i,exp:i+3600,auth_time:i,sub:s,user_id:s,firebase:{sign_in_provider:"custom",identities:{}},...n};return[Do(JSON.stringify(t)),Do(JSON.stringify(o)),""].join(".")}const Fi={};function gT(){const n={prod:[],emulator:[]};for(const e of Object.keys(Fi))Fi[e]?n.emulator.push(e):n.prod.push(e);return n}function _T(n){let e=document.getElementById(n),t=!1;return e||(e=document.createElement("div"),e.setAttribute("id",n),t=!0),{created:t,element:e}}let yd=!1;function Nu(n,e){if(typeof window>"u"||typeof document>"u"||!bt(window.location.host)||Fi[n]===e||Fi[n]||yd)return;Fi[n]=e;function t(g){return`__firebase__banner__${g}`}const r="__firebase__banner",s=gT().prod.length>0;function o(){const g=document.getElementById(r);g&&g.remove()}function c(g){g.style.display="flex",g.style.background="#7faaf0",g.style.position="fixed",g.style.bottom="5px",g.style.left="5px",g.style.padding=".5em",g.style.borderRadius="5px",g.style.alignItems="center"}function u(g,A){g.setAttribute("width","24"),g.setAttribute("id",A),g.setAttribute("height","24"),g.setAttribute("viewBox","0 0 24 24"),g.setAttribute("fill","none"),g.style.marginLeft="-6px"}function l(){const g=document.createElement("span");return g.style.cursor="pointer",g.style.marginLeft="16px",g.style.fontSize="24px",g.innerHTML=" &times;",g.onclick=()=>{yd=!0,o()},g}function f(g,A){g.setAttribute("id",A),g.innerText="Learn more",g.href="https://firebase.google.com/docs/studio/preview-apps#preview-backend",g.setAttribute("target","__blank"),g.style.paddingLeft="5px",g.style.textDecoration="underline"}function p(){const g=_T(r),A=t("text"),C=document.getElementById(A)||document.createElement("span"),V=t("learnmore"),D=document.getElementById(V)||document.createElement("a"),j=t("preprendIcon"),q=document.getElementById(j)||document.createElementNS("http://www.w3.org/2000/svg","svg");if(g.created){const U=g.element;c(U),f(D,V);const G=l();u(q,j),U.append(q,C,D,G),document.body.appendChild(U)}s?(C.innerText="Preview backend disconnected.",q.innerHTML=`<g clip-path="url(#clip0_6013_33858)">
<path d="M4.8 17.6L12 5.6L19.2 17.6H4.8ZM6.91667 16.4H17.0833L12 7.93333L6.91667 16.4ZM12 15.6C12.1667 15.6 12.3056 15.5444 12.4167 15.4333C12.5389 15.3111 12.6 15.1667 12.6 15C12.6 14.8333 12.5389 14.6944 12.4167 14.5833C12.3056 14.4611 12.1667 14.4 12 14.4C11.8333 14.4 11.6889 14.4611 11.5667 14.5833C11.4556 14.6944 11.4 14.8333 11.4 15C11.4 15.1667 11.4556 15.3111 11.5667 15.4333C11.6889 15.5444 11.8333 15.6 12 15.6ZM11.4 13.6H12.6V10.4H11.4V13.6Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6013_33858">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`):(q.innerHTML=`<g clip-path="url(#clip0_6083_34804)">
<path d="M11.4 15.2H12.6V11.2H11.4V15.2ZM12 10C12.1667 10 12.3056 9.94444 12.4167 9.83333C12.5389 9.71111 12.6 9.56667 12.6 9.4C12.6 9.23333 12.5389 9.09444 12.4167 8.98333C12.3056 8.86111 12.1667 8.8 12 8.8C11.8333 8.8 11.6889 8.86111 11.5667 8.98333C11.4556 9.09444 11.4 9.23333 11.4 9.4C11.4 9.56667 11.4556 9.71111 11.5667 9.83333C11.6889 9.94444 11.8333 10 12 10ZM12 18.4C11.1222 18.4 10.2944 18.2333 9.51667 17.9C8.73889 17.5667 8.05556 17.1111 7.46667 16.5333C6.88889 15.9444 6.43333 15.2611 6.1 14.4833C5.76667 13.7056 5.6 12.8778 5.6 12C5.6 11.1111 5.76667 10.2833 6.1 9.51667C6.43333 8.73889 6.88889 8.06111 7.46667 7.48333C8.05556 6.89444 8.73889 6.43333 9.51667 6.1C10.2944 5.76667 11.1222 5.6 12 5.6C12.8889 5.6 13.7167 5.76667 14.4833 6.1C15.2611 6.43333 15.9389 6.89444 16.5167 7.48333C17.1056 8.06111 17.5667 8.73889 17.9 9.51667C18.2333 10.2833 18.4 11.1111 18.4 12C18.4 12.8778 18.2333 13.7056 17.9 14.4833C17.5667 15.2611 17.1056 15.9444 16.5167 16.5333C15.9389 17.1111 15.2611 17.5667 14.4833 17.9C13.7167 18.2333 12.8889 18.4 12 18.4ZM12 17.2C13.4444 17.2 14.6722 16.6944 15.6833 15.6833C16.6944 14.6722 17.2 13.4444 17.2 12C17.2 10.5556 16.6944 9.32778 15.6833 8.31667C14.6722 7.30555 13.4444 6.8 12 6.8C10.5556 6.8 9.32778 7.30555 8.31667 8.31667C7.30556 9.32778 6.8 10.5556 6.8 12C6.8 13.4444 7.30556 14.6722 8.31667 15.6833C9.32778 16.6944 10.5556 17.2 12 17.2Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6083_34804">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`,C.innerText="Preview backend running in this workspace."),C.setAttribute("id",A)}document.readyState==="loading"?window.addEventListener("DOMContentLoaded",p):p()}/**
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
 */function Ee(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function yT(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(Ee())}function sm(){const n=ca()?.forceEnvironment;if(n==="node")return!0;if(n==="browser")return!1;try{return Object.prototype.toString.call(global.process)==="[object process]"}catch{return!1}}function IT(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function Vu(){const n=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof n=="object"&&n.id!==void 0}function TT(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function ET(){const n=Ee();return n.indexOf("MSIE ")>=0||n.indexOf("Trident/")>=0}function om(){return!sm()&&!!navigator.userAgent&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")}function am(){return!sm()&&!!navigator.userAgent&&(navigator.userAgent.includes("Safari")||navigator.userAgent.includes("WebKit"))&&!navigator.userAgent.includes("Chrome")}function _s(){try{return typeof indexedDB=="object"}catch{return!1}}function la(){return new Promise((n,e)=>{try{let t=!0;const r="validate-browser-context-for-indexeddb-analytics-module",i=self.indexedDB.open(r);i.onsuccess=()=>{i.result.close(),t||self.indexedDB.deleteDatabase(r),n(!0)},i.onupgradeneeded=()=>{t=!1},i.onerror=()=>{e(i.error?.message||"")}}catch(t){e(t)}})}function Ou(){return!(typeof navigator>"u"||!navigator.cookieEnabled)}/**
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
 */const wT="FirebaseError";class rt extends Error{constructor(e,t,r){super(t),this.code=e,this.customData=r,this.name=wT,Object.setPrototypeOf(this,rt.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,yn.prototype.create)}}class yn{constructor(e,t,r){this.service=e,this.serviceName=t,this.errors=r}create(e,...t){const r=t[0]||{},i=`${this.service}/${e}`,s=this.errors[e],o=s?vT(s,r):"Error",c=`${this.serviceName}: ${o} (${i}).`;return new rt(i,c,r)}}function vT(n,e){return n.replace(AT,(t,r)=>{const i=e[r];return i!=null?String(i):`<${r}?>`})}const AT=/\{\$([^}]+)}/g;function bT(n){for(const e in n)if(Object.prototype.hasOwnProperty.call(n,e))return!1;return!0}function hn(n,e){if(n===e)return!0;const t=Object.keys(n),r=Object.keys(e);for(const i of t){if(!r.includes(i))return!1;const s=n[i],o=e[i];if(Id(s)&&Id(o)){if(!hn(s,o))return!1}else if(s!==o)return!1}for(const i of r)if(!t.includes(i))return!1;return!0}function Id(n){return n!==null&&typeof n=="object"}/**
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
 */function ys(n){const e=[];for(const[t,r]of Object.entries(n))Array.isArray(r)?r.forEach(i=>{e.push(encodeURIComponent(t)+"="+encodeURIComponent(i))}):e.push(encodeURIComponent(t)+"="+encodeURIComponent(r));return e.length?"&"+e.join("&"):""}function Ni(n){const e={};return n.replace(/^\?/,"").split("&").forEach(r=>{if(r){const[i,s]=r.split("=");e[decodeURIComponent(i)]=decodeURIComponent(s)}}),e}function Vi(n){const e=n.indexOf("?");if(!e)return"";const t=n.indexOf("#",e);return n.substring(e,t>0?t:void 0)}function RT(n,e){const t=new ST(n,e);return t.subscribe.bind(t)}class ST{constructor(e,t){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=t,this.task.then(()=>{e(this)}).catch(r=>{this.error(r)})}next(e){this.forEachObserver(t=>{t.next(e)})}error(e){this.forEachObserver(t=>{t.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,t,r){let i;if(e===void 0&&t===void 0&&r===void 0)throw new Error("Missing Observer.");PT(e,["next","error","complete"])?i=e:i={next:e,error:t,complete:r},i.next===void 0&&(i.next=dc),i.error===void 0&&(i.error=dc),i.complete===void 0&&(i.complete=dc);const s=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?i.error(this.finalError):i.complete()}catch{}}),this.observers.push(i),s}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let t=0;t<this.observers.length;t++)this.sendOne(t,e)}sendOne(e,t){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{t(this.observers[e])}catch(r){typeof console<"u"&&console.error&&console.error(r)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function PT(n,e){if(typeof n!="object"||n===null)return!1;for(const t of e)if(t in n&&typeof n[t]=="function")return!0;return!1}function dc(){}/**
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
 */const CT=1e3,kT=2,DT=14400*1e3,NT=.5;function Td(n,e=CT,t=kT){const r=e*Math.pow(t,n),i=Math.round(NT*r*(Math.random()-.5)*2);return Math.min(DT,r+i)}/**
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
 */function K(n){return n&&n._delegate?n._delegate:n}class Ke{constructor(e,t,r){this.name=e,this.instanceFactory=t,this.type=r,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
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
 */const Nn="[DEFAULT]";/**
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
 */class VT{constructor(e,t){this.name=e,this.container=t,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const t=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(t)){const r=new pT;if(this.instancesDeferred.set(t,r),this.isInitialized(t)||this.shouldAutoInitialize())try{const i=this.getOrInitializeService({instanceIdentifier:t});i&&r.resolve(i)}catch{}}return this.instancesDeferred.get(t).promise}getImmediate(e){const t=this.normalizeInstanceIdentifier(e?.identifier),r=e?.optional??!1;if(this.isInitialized(t)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:t})}catch(i){if(r)return null;throw i}else{if(r)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(xT(e))try{this.getOrInitializeService({instanceIdentifier:Nn})}catch{}for(const[t,r]of this.instancesDeferred.entries()){const i=this.normalizeInstanceIdentifier(t);try{const s=this.getOrInitializeService({instanceIdentifier:i});r.resolve(s)}catch{}}}}clearInstance(e=Nn){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(t=>"INTERNAL"in t).map(t=>t.INTERNAL.delete()),...e.filter(t=>"_delete"in t).map(t=>t._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=Nn){return this.instances.has(e)}getOptions(e=Nn){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:t={}}=e,r=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(r))throw Error(`${this.name}(${r}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const i=this.getOrInitializeService({instanceIdentifier:r,options:t});for(const[s,o]of this.instancesDeferred.entries()){const c=this.normalizeInstanceIdentifier(s);r===c&&o.resolve(i)}return i}onInit(e,t){const r=this.normalizeInstanceIdentifier(t),i=this.onInitCallbacks.get(r)??new Set;i.add(e),this.onInitCallbacks.set(r,i);const s=this.instances.get(r);return s&&e(s,r),()=>{i.delete(e)}}invokeOnInitCallbacks(e,t){const r=this.onInitCallbacks.get(t);if(r)for(const i of r)try{i(e,t)}catch{}}getOrInitializeService({instanceIdentifier:e,options:t={}}){let r=this.instances.get(e);if(!r&&this.component&&(r=this.component.instanceFactory(this.container,{instanceIdentifier:OT(e),options:t}),this.instances.set(e,r),this.instancesOptions.set(e,t),this.invokeOnInitCallbacks(r,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,r)}catch{}return r||null}normalizeInstanceIdentifier(e=Nn){return this.component?this.component.multipleInstances?e:Nn:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function OT(n){return n===Nn?void 0:n}function xT(n){return n.instantiationMode==="EAGER"}/**
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
 */class MT{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const t=this.getProvider(e.name);if(t.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);t.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const t=new VT(e,this);return this.providers.set(e,t),t}getProviders(){return Array.from(this.providers.values())}}/**
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
 */var J;(function(n){n[n.DEBUG=0]="DEBUG",n[n.VERBOSE=1]="VERBOSE",n[n.INFO=2]="INFO",n[n.WARN=3]="WARN",n[n.ERROR=4]="ERROR",n[n.SILENT=5]="SILENT"})(J||(J={}));const LT={debug:J.DEBUG,verbose:J.VERBOSE,info:J.INFO,warn:J.WARN,error:J.ERROR,silent:J.SILENT},FT=J.INFO,UT={[J.DEBUG]:"log",[J.VERBOSE]:"log",[J.INFO]:"info",[J.WARN]:"warn",[J.ERROR]:"error"},BT=(n,e,...t)=>{if(e<n.logLevel)return;const r=new Date().toISOString(),i=UT[e];if(i)console[i](`[${r}]  ${n.name}:`,...t);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class Is{constructor(e){this.name=e,this._logLevel=FT,this._logHandler=BT,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in J))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?LT[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,J.DEBUG,...e),this._logHandler(this,J.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,J.VERBOSE,...e),this._logHandler(this,J.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,J.INFO,...e),this._logHandler(this,J.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,J.WARN,...e),this._logHandler(this,J.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,J.ERROR,...e),this._logHandler(this,J.ERROR,...e)}}const $T=(n,e)=>e.some(t=>n instanceof t);let Ed,wd;function qT(){return Ed||(Ed=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function jT(){return wd||(wd=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const cm=new WeakMap,Bc=new WeakMap,um=new WeakMap,fc=new WeakMap,xu=new WeakMap;function zT(n){const e=new Promise((t,r)=>{const i=()=>{n.removeEventListener("success",s),n.removeEventListener("error",o)},s=()=>{t(sn(n.result)),i()},o=()=>{r(n.error),i()};n.addEventListener("success",s),n.addEventListener("error",o)});return e.then(t=>{t instanceof IDBCursor&&cm.set(t,n)}).catch(()=>{}),xu.set(e,n),e}function GT(n){if(Bc.has(n))return;const e=new Promise((t,r)=>{const i=()=>{n.removeEventListener("complete",s),n.removeEventListener("error",o),n.removeEventListener("abort",o)},s=()=>{t(),i()},o=()=>{r(n.error||new DOMException("AbortError","AbortError")),i()};n.addEventListener("complete",s),n.addEventListener("error",o),n.addEventListener("abort",o)});Bc.set(n,e)}let $c={get(n,e,t){if(n instanceof IDBTransaction){if(e==="done")return Bc.get(n);if(e==="objectStoreNames")return n.objectStoreNames||um.get(n);if(e==="store")return t.objectStoreNames[1]?void 0:t.objectStore(t.objectStoreNames[0])}return sn(n[e])},set(n,e,t){return n[e]=t,!0},has(n,e){return n instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in n}};function KT(n){$c=n($c)}function HT(n){return n===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...t){const r=n.call(pc(this),e,...t);return um.set(r,e.sort?e.sort():[e]),sn(r)}:jT().includes(n)?function(...e){return n.apply(pc(this),e),sn(cm.get(this))}:function(...e){return sn(n.apply(pc(this),e))}}function WT(n){return typeof n=="function"?HT(n):(n instanceof IDBTransaction&&GT(n),$T(n,qT())?new Proxy(n,$c):n)}function sn(n){if(n instanceof IDBRequest)return zT(n);if(fc.has(n))return fc.get(n);const e=WT(n);return e!==n&&(fc.set(n,e),xu.set(e,n)),e}const pc=n=>xu.get(n);function lm(n,e,{blocked:t,upgrade:r,blocking:i,terminated:s}={}){const o=indexedDB.open(n,e),c=sn(o);return r&&o.addEventListener("upgradeneeded",u=>{r(sn(o.result),u.oldVersion,u.newVersion,sn(o.transaction),u)}),t&&o.addEventListener("blocked",u=>t(u.oldVersion,u.newVersion,u)),c.then(u=>{s&&u.addEventListener("close",()=>s()),i&&u.addEventListener("versionchange",l=>i(l.oldVersion,l.newVersion,l))}).catch(()=>{}),c}const QT=["get","getKey","getAll","getAllKeys","count"],JT=["put","add","delete","clear"],mc=new Map;function vd(n,e){if(!(n instanceof IDBDatabase&&!(e in n)&&typeof e=="string"))return;if(mc.get(e))return mc.get(e);const t=e.replace(/FromIndex$/,""),r=e!==t,i=JT.includes(t);if(!(t in(r?IDBIndex:IDBObjectStore).prototype)||!(i||QT.includes(t)))return;const s=async function(o,...c){const u=this.transaction(o,i?"readwrite":"readonly");let l=u.store;return r&&(l=l.index(c.shift())),(await Promise.all([l[t](...c),i&&u.done]))[0]};return mc.set(e,s),s}KT(n=>({...n,get:(e,t,r)=>vd(e,t)||n.get(e,t,r),has:(e,t)=>!!vd(e,t)||n.has(e,t)}));/**
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
 */class YT{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(t=>{if(XT(t)){const r=t.getImmediate();return`${r.library}/${r.version}`}else return null}).filter(t=>t).join(" ")}}function XT(n){return n.getComponent()?.type==="VERSION"}const qc="@firebase/app",Ad="0.14.8";/**
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
 */const Nt=new Is("@firebase/app"),ZT="@firebase/app-compat",eE="@firebase/analytics-compat",tE="@firebase/analytics",nE="@firebase/app-check-compat",rE="@firebase/app-check",iE="@firebase/auth",sE="@firebase/auth-compat",oE="@firebase/database",aE="@firebase/data-connect",cE="@firebase/database-compat",uE="@firebase/functions",lE="@firebase/functions-compat",hE="@firebase/installations",dE="@firebase/installations-compat",fE="@firebase/messaging",pE="@firebase/messaging-compat",mE="@firebase/performance",gE="@firebase/performance-compat",_E="@firebase/remote-config",yE="@firebase/remote-config-compat",IE="@firebase/storage",TE="@firebase/storage-compat",EE="@firebase/firestore",wE="@firebase/ai",vE="@firebase/firestore-compat",AE="firebase",bE="12.9.0";/**
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
 */const jc="[DEFAULT]",RE={[qc]:"fire-core",[ZT]:"fire-core-compat",[tE]:"fire-analytics",[eE]:"fire-analytics-compat",[rE]:"fire-app-check",[nE]:"fire-app-check-compat",[iE]:"fire-auth",[sE]:"fire-auth-compat",[oE]:"fire-rtdb",[aE]:"fire-data-connect",[cE]:"fire-rtdb-compat",[uE]:"fire-fn",[lE]:"fire-fn-compat",[hE]:"fire-iid",[dE]:"fire-iid-compat",[fE]:"fire-fcm",[pE]:"fire-fcm-compat",[mE]:"fire-perf",[gE]:"fire-perf-compat",[_E]:"fire-rc",[yE]:"fire-rc-compat",[IE]:"fire-gcs",[TE]:"fire-gcs-compat",[EE]:"fire-fst",[vE]:"fire-fst-compat",[wE]:"fire-vertex","fire-js":"fire-js",[AE]:"fire-js-all"};/**
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
 */const No=new Map,SE=new Map,zc=new Map;function bd(n,e){try{n.container.addComponent(e)}catch(t){Nt.debug(`Component ${e.name} failed to register with FirebaseApp ${n.name}`,t)}}function tt(n){const e=n.name;if(zc.has(e))return Nt.debug(`There were multiple attempts to register component ${e}.`),!1;zc.set(e,n);for(const t of No.values())bd(t,n);for(const t of SE.values())bd(t,n);return!0}function Rt(n,e){const t=n.container.getProvider("heartbeat").getImmediate({optional:!0});return t&&t.triggerHeartbeat(),n.container.getProvider(e)}function qe(n){return n==null?!1:n.settings!==void 0}/**
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
 */const PE={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},on=new yn("app","Firebase",PE);/**
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
 */class CE{constructor(e,t,r){this._isDeleted=!1,this._options={...e},this._config={...t},this._name=t.name,this._automaticDataCollectionEnabled=t.automaticDataCollectionEnabled,this._container=r,this.container.addComponent(new Ke("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw on.create("app-deleted",{appName:this._name})}}/**
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
 */const sr=bE;function kE(n,e={}){let t=n;typeof e!="object"&&(e={name:e});const r={name:jc,automaticDataCollectionEnabled:!0,...e},i=r.name;if(typeof i!="string"||!i)throw on.create("bad-app-name",{appName:String(i)});if(t||(t=rm()),!t)throw on.create("no-options");const s=No.get(i);if(s){if(hn(t,s.options)&&hn(r,s.config))return s;throw on.create("duplicate-app",{appName:i})}const o=new MT(i);for(const u of zc.values())o.addComponent(u);const c=new CE(t,r,o);return No.set(i,c),c}function Ts(n=jc){const e=No.get(n);if(!e&&n===jc&&rm())return kE();if(!e)throw on.create("no-app",{appName:n});return e}function be(n,e,t){let r=RE[n]??n;t&&(r+=`-${t}`);const i=r.match(/\s|\//),s=e.match(/\s|\//);if(i||s){const o=[`Unable to register library "${r}" with version "${e}":`];i&&o.push(`library name "${r}" contains illegal characters (whitespace or "/")`),i&&s&&o.push("and"),s&&o.push(`version name "${e}" contains illegal characters (whitespace or "/")`),Nt.warn(o.join(" "));return}tt(new Ke(`${r}-version`,()=>({library:r,version:e}),"VERSION"))}/**
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
 */const DE="firebase-heartbeat-database",NE=1,Zi="firebase-heartbeat-store";let gc=null;function hm(){return gc||(gc=lm(DE,NE,{upgrade:(n,e)=>{switch(e){case 0:try{n.createObjectStore(Zi)}catch(t){console.warn(t)}}}}).catch(n=>{throw on.create("idb-open",{originalErrorMessage:n.message})})),gc}async function VE(n){try{const t=(await hm()).transaction(Zi),r=await t.objectStore(Zi).get(dm(n));return await t.done,r}catch(e){if(e instanceof rt)Nt.warn(e.message);else{const t=on.create("idb-get",{originalErrorMessage:e?.message});Nt.warn(t.message)}}}async function Rd(n,e){try{const r=(await hm()).transaction(Zi,"readwrite");await r.objectStore(Zi).put(e,dm(n)),await r.done}catch(t){if(t instanceof rt)Nt.warn(t.message);else{const r=on.create("idb-set",{originalErrorMessage:t?.message});Nt.warn(r.message)}}}function dm(n){return`${n.name}!${n.options.appId}`}/**
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
 */const OE=1024,xE=30;class ME{constructor(e){this.container=e,this._heartbeatsCache=null;const t=this.container.getProvider("app").getImmediate();this._storage=new FE(t),this._heartbeatsCachePromise=this._storage.read().then(r=>(this._heartbeatsCache=r,r))}async triggerHeartbeat(){try{const t=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),r=Sd();if(this._heartbeatsCache?.heartbeats==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,this._heartbeatsCache?.heartbeats==null)||this._heartbeatsCache.lastSentHeartbeatDate===r||this._heartbeatsCache.heartbeats.some(i=>i.date===r))return;if(this._heartbeatsCache.heartbeats.push({date:r,agent:t}),this._heartbeatsCache.heartbeats.length>xE){const i=UE(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(i,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(e){Nt.warn(e)}}async getHeartbeatsHeader(){try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,this._heartbeatsCache?.heartbeats==null||this._heartbeatsCache.heartbeats.length===0)return"";const e=Sd(),{heartbeatsToSend:t,unsentEntries:r}=LE(this._heartbeatsCache.heartbeats),i=Do(JSON.stringify({version:2,heartbeats:t}));return this._heartbeatsCache.lastSentHeartbeatDate=e,r.length>0?(this._heartbeatsCache.heartbeats=r,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),i}catch(e){return Nt.warn(e),""}}}function Sd(){return new Date().toISOString().substring(0,10)}function LE(n,e=OE){const t=[];let r=n.slice();for(const i of n){const s=t.find(o=>o.agent===i.agent);if(s){if(s.dates.push(i.date),Pd(t)>e){s.dates.pop();break}}else if(t.push({agent:i.agent,dates:[i.date]}),Pd(t)>e){t.pop();break}r=r.slice(1)}return{heartbeatsToSend:t,unsentEntries:r}}class FE{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return _s()?la().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const t=await VE(this.app);return t?.heartbeats?t:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){if(await this._canUseIndexedDBPromise){const r=await this.read();return Rd(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){if(await this._canUseIndexedDBPromise){const r=await this.read();return Rd(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:[...r.heartbeats,...e.heartbeats]})}else return}}function Pd(n){return Do(JSON.stringify({version:2,heartbeats:n})).length}function UE(n){if(n.length===0)return-1;let e=0,t=n[0].date;for(let r=1;r<n.length;r++)n[r].date<t&&(t=n[r].date,e=r);return e}/**
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
 */function BE(n){tt(new Ke("platform-logger",e=>new YT(e),"PRIVATE")),tt(new Ke("heartbeat",e=>new ME(e),"PRIVATE")),be(qc,Ad,n),be(qc,Ad,"esm2020"),be("fire-js","")}BE("");var Cd=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var an,fm;(function(){var n;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function e(T,_){function I(){}I.prototype=_.prototype,T.F=_.prototype,T.prototype=new I,T.prototype.constructor=T,T.D=function(w,E,R){for(var y=Array(arguments.length-2),$e=2;$e<arguments.length;$e++)y[$e-2]=arguments[$e];return _.prototype[E].apply(w,y)}}function t(){this.blockSize=-1}function r(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.C=Array(this.blockSize),this.o=this.h=0,this.u()}e(r,t),r.prototype.u=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function i(T,_,I){I||(I=0);const w=Array(16);if(typeof _=="string")for(var E=0;E<16;++E)w[E]=_.charCodeAt(I++)|_.charCodeAt(I++)<<8|_.charCodeAt(I++)<<16|_.charCodeAt(I++)<<24;else for(E=0;E<16;++E)w[E]=_[I++]|_[I++]<<8|_[I++]<<16|_[I++]<<24;_=T.g[0],I=T.g[1],E=T.g[2];let R=T.g[3],y;y=_+(R^I&(E^R))+w[0]+3614090360&4294967295,_=I+(y<<7&4294967295|y>>>25),y=R+(E^_&(I^E))+w[1]+3905402710&4294967295,R=_+(y<<12&4294967295|y>>>20),y=E+(I^R&(_^I))+w[2]+606105819&4294967295,E=R+(y<<17&4294967295|y>>>15),y=I+(_^E&(R^_))+w[3]+3250441966&4294967295,I=E+(y<<22&4294967295|y>>>10),y=_+(R^I&(E^R))+w[4]+4118548399&4294967295,_=I+(y<<7&4294967295|y>>>25),y=R+(E^_&(I^E))+w[5]+1200080426&4294967295,R=_+(y<<12&4294967295|y>>>20),y=E+(I^R&(_^I))+w[6]+2821735955&4294967295,E=R+(y<<17&4294967295|y>>>15),y=I+(_^E&(R^_))+w[7]+4249261313&4294967295,I=E+(y<<22&4294967295|y>>>10),y=_+(R^I&(E^R))+w[8]+1770035416&4294967295,_=I+(y<<7&4294967295|y>>>25),y=R+(E^_&(I^E))+w[9]+2336552879&4294967295,R=_+(y<<12&4294967295|y>>>20),y=E+(I^R&(_^I))+w[10]+4294925233&4294967295,E=R+(y<<17&4294967295|y>>>15),y=I+(_^E&(R^_))+w[11]+2304563134&4294967295,I=E+(y<<22&4294967295|y>>>10),y=_+(R^I&(E^R))+w[12]+1804603682&4294967295,_=I+(y<<7&4294967295|y>>>25),y=R+(E^_&(I^E))+w[13]+4254626195&4294967295,R=_+(y<<12&4294967295|y>>>20),y=E+(I^R&(_^I))+w[14]+2792965006&4294967295,E=R+(y<<17&4294967295|y>>>15),y=I+(_^E&(R^_))+w[15]+1236535329&4294967295,I=E+(y<<22&4294967295|y>>>10),y=_+(E^R&(I^E))+w[1]+4129170786&4294967295,_=I+(y<<5&4294967295|y>>>27),y=R+(I^E&(_^I))+w[6]+3225465664&4294967295,R=_+(y<<9&4294967295|y>>>23),y=E+(_^I&(R^_))+w[11]+643717713&4294967295,E=R+(y<<14&4294967295|y>>>18),y=I+(R^_&(E^R))+w[0]+3921069994&4294967295,I=E+(y<<20&4294967295|y>>>12),y=_+(E^R&(I^E))+w[5]+3593408605&4294967295,_=I+(y<<5&4294967295|y>>>27),y=R+(I^E&(_^I))+w[10]+38016083&4294967295,R=_+(y<<9&4294967295|y>>>23),y=E+(_^I&(R^_))+w[15]+3634488961&4294967295,E=R+(y<<14&4294967295|y>>>18),y=I+(R^_&(E^R))+w[4]+3889429448&4294967295,I=E+(y<<20&4294967295|y>>>12),y=_+(E^R&(I^E))+w[9]+568446438&4294967295,_=I+(y<<5&4294967295|y>>>27),y=R+(I^E&(_^I))+w[14]+3275163606&4294967295,R=_+(y<<9&4294967295|y>>>23),y=E+(_^I&(R^_))+w[3]+4107603335&4294967295,E=R+(y<<14&4294967295|y>>>18),y=I+(R^_&(E^R))+w[8]+1163531501&4294967295,I=E+(y<<20&4294967295|y>>>12),y=_+(E^R&(I^E))+w[13]+2850285829&4294967295,_=I+(y<<5&4294967295|y>>>27),y=R+(I^E&(_^I))+w[2]+4243563512&4294967295,R=_+(y<<9&4294967295|y>>>23),y=E+(_^I&(R^_))+w[7]+1735328473&4294967295,E=R+(y<<14&4294967295|y>>>18),y=I+(R^_&(E^R))+w[12]+2368359562&4294967295,I=E+(y<<20&4294967295|y>>>12),y=_+(I^E^R)+w[5]+4294588738&4294967295,_=I+(y<<4&4294967295|y>>>28),y=R+(_^I^E)+w[8]+2272392833&4294967295,R=_+(y<<11&4294967295|y>>>21),y=E+(R^_^I)+w[11]+1839030562&4294967295,E=R+(y<<16&4294967295|y>>>16),y=I+(E^R^_)+w[14]+4259657740&4294967295,I=E+(y<<23&4294967295|y>>>9),y=_+(I^E^R)+w[1]+2763975236&4294967295,_=I+(y<<4&4294967295|y>>>28),y=R+(_^I^E)+w[4]+1272893353&4294967295,R=_+(y<<11&4294967295|y>>>21),y=E+(R^_^I)+w[7]+4139469664&4294967295,E=R+(y<<16&4294967295|y>>>16),y=I+(E^R^_)+w[10]+3200236656&4294967295,I=E+(y<<23&4294967295|y>>>9),y=_+(I^E^R)+w[13]+681279174&4294967295,_=I+(y<<4&4294967295|y>>>28),y=R+(_^I^E)+w[0]+3936430074&4294967295,R=_+(y<<11&4294967295|y>>>21),y=E+(R^_^I)+w[3]+3572445317&4294967295,E=R+(y<<16&4294967295|y>>>16),y=I+(E^R^_)+w[6]+76029189&4294967295,I=E+(y<<23&4294967295|y>>>9),y=_+(I^E^R)+w[9]+3654602809&4294967295,_=I+(y<<4&4294967295|y>>>28),y=R+(_^I^E)+w[12]+3873151461&4294967295,R=_+(y<<11&4294967295|y>>>21),y=E+(R^_^I)+w[15]+530742520&4294967295,E=R+(y<<16&4294967295|y>>>16),y=I+(E^R^_)+w[2]+3299628645&4294967295,I=E+(y<<23&4294967295|y>>>9),y=_+(E^(I|~R))+w[0]+4096336452&4294967295,_=I+(y<<6&4294967295|y>>>26),y=R+(I^(_|~E))+w[7]+1126891415&4294967295,R=_+(y<<10&4294967295|y>>>22),y=E+(_^(R|~I))+w[14]+2878612391&4294967295,E=R+(y<<15&4294967295|y>>>17),y=I+(R^(E|~_))+w[5]+4237533241&4294967295,I=E+(y<<21&4294967295|y>>>11),y=_+(E^(I|~R))+w[12]+1700485571&4294967295,_=I+(y<<6&4294967295|y>>>26),y=R+(I^(_|~E))+w[3]+2399980690&4294967295,R=_+(y<<10&4294967295|y>>>22),y=E+(_^(R|~I))+w[10]+4293915773&4294967295,E=R+(y<<15&4294967295|y>>>17),y=I+(R^(E|~_))+w[1]+2240044497&4294967295,I=E+(y<<21&4294967295|y>>>11),y=_+(E^(I|~R))+w[8]+1873313359&4294967295,_=I+(y<<6&4294967295|y>>>26),y=R+(I^(_|~E))+w[15]+4264355552&4294967295,R=_+(y<<10&4294967295|y>>>22),y=E+(_^(R|~I))+w[6]+2734768916&4294967295,E=R+(y<<15&4294967295|y>>>17),y=I+(R^(E|~_))+w[13]+1309151649&4294967295,I=E+(y<<21&4294967295|y>>>11),y=_+(E^(I|~R))+w[4]+4149444226&4294967295,_=I+(y<<6&4294967295|y>>>26),y=R+(I^(_|~E))+w[11]+3174756917&4294967295,R=_+(y<<10&4294967295|y>>>22),y=E+(_^(R|~I))+w[2]+718787259&4294967295,E=R+(y<<15&4294967295|y>>>17),y=I+(R^(E|~_))+w[9]+3951481745&4294967295,T.g[0]=T.g[0]+_&4294967295,T.g[1]=T.g[1]+(E+(y<<21&4294967295|y>>>11))&4294967295,T.g[2]=T.g[2]+E&4294967295,T.g[3]=T.g[3]+R&4294967295}r.prototype.v=function(T,_){_===void 0&&(_=T.length);const I=_-this.blockSize,w=this.C;let E=this.h,R=0;for(;R<_;){if(E==0)for(;R<=I;)i(this,T,R),R+=this.blockSize;if(typeof T=="string"){for(;R<_;)if(w[E++]=T.charCodeAt(R++),E==this.blockSize){i(this,w),E=0;break}}else for(;R<_;)if(w[E++]=T[R++],E==this.blockSize){i(this,w),E=0;break}}this.h=E,this.o+=_},r.prototype.A=function(){var T=Array((this.h<56?this.blockSize:this.blockSize*2)-this.h);T[0]=128;for(var _=1;_<T.length-8;++_)T[_]=0;_=this.o*8;for(var I=T.length-8;I<T.length;++I)T[I]=_&255,_/=256;for(this.v(T),T=Array(16),_=0,I=0;I<4;++I)for(let w=0;w<32;w+=8)T[_++]=this.g[I]>>>w&255;return T};function s(T,_){var I=c;return Object.prototype.hasOwnProperty.call(I,T)?I[T]:I[T]=_(T)}function o(T,_){this.h=_;const I=[];let w=!0;for(let E=T.length-1;E>=0;E--){const R=T[E]|0;w&&R==_||(I[E]=R,w=!1)}this.g=I}var c={};function u(T){return-128<=T&&T<128?s(T,function(_){return new o([_|0],_<0?-1:0)}):new o([T|0],T<0?-1:0)}function l(T){if(isNaN(T)||!isFinite(T))return p;if(T<0)return D(l(-T));const _=[];let I=1;for(let w=0;T>=I;w++)_[w]=T/I|0,I*=4294967296;return new o(_,0)}function f(T,_){if(T.length==0)throw Error("number format error: empty string");if(_=_||10,_<2||36<_)throw Error("radix out of range: "+_);if(T.charAt(0)=="-")return D(f(T.substring(1),_));if(T.indexOf("-")>=0)throw Error('number format error: interior "-" character');const I=l(Math.pow(_,8));let w=p;for(let R=0;R<T.length;R+=8){var E=Math.min(8,T.length-R);const y=parseInt(T.substring(R,R+E),_);E<8?(E=l(Math.pow(_,E)),w=w.j(E).add(l(y))):(w=w.j(I),w=w.add(l(y)))}return w}var p=u(0),g=u(1),A=u(16777216);n=o.prototype,n.m=function(){if(V(this))return-D(this).m();let T=0,_=1;for(let I=0;I<this.g.length;I++){const w=this.i(I);T+=(w>=0?w:4294967296+w)*_,_*=4294967296}return T},n.toString=function(T){if(T=T||10,T<2||36<T)throw Error("radix out of range: "+T);if(C(this))return"0";if(V(this))return"-"+D(this).toString(T);const _=l(Math.pow(T,6));var I=this;let w="";for(;;){const E=G(I,_).g;I=j(I,E.j(_));let R=((I.g.length>0?I.g[0]:I.h)>>>0).toString(T);if(I=E,C(I))return R+w;for(;R.length<6;)R="0"+R;w=R+w}},n.i=function(T){return T<0?0:T<this.g.length?this.g[T]:this.h};function C(T){if(T.h!=0)return!1;for(let _=0;_<T.g.length;_++)if(T.g[_]!=0)return!1;return!0}function V(T){return T.h==-1}n.l=function(T){return T=j(this,T),V(T)?-1:C(T)?0:1};function D(T){const _=T.g.length,I=[];for(let w=0;w<_;w++)I[w]=~T.g[w];return new o(I,~T.h).add(g)}n.abs=function(){return V(this)?D(this):this},n.add=function(T){const _=Math.max(this.g.length,T.g.length),I=[];let w=0;for(let E=0;E<=_;E++){let R=w+(this.i(E)&65535)+(T.i(E)&65535),y=(R>>>16)+(this.i(E)>>>16)+(T.i(E)>>>16);w=y>>>16,R&=65535,y&=65535,I[E]=y<<16|R}return new o(I,I[I.length-1]&-2147483648?-1:0)};function j(T,_){return T.add(D(_))}n.j=function(T){if(C(this)||C(T))return p;if(V(this))return V(T)?D(this).j(D(T)):D(D(this).j(T));if(V(T))return D(this.j(D(T)));if(this.l(A)<0&&T.l(A)<0)return l(this.m()*T.m());const _=this.g.length+T.g.length,I=[];for(var w=0;w<2*_;w++)I[w]=0;for(w=0;w<this.g.length;w++)for(let E=0;E<T.g.length;E++){const R=this.i(w)>>>16,y=this.i(w)&65535,$e=T.i(E)>>>16,bn=T.i(E)&65535;I[2*w+2*E]+=y*bn,q(I,2*w+2*E),I[2*w+2*E+1]+=R*bn,q(I,2*w+2*E+1),I[2*w+2*E+1]+=y*$e,q(I,2*w+2*E+1),I[2*w+2*E+2]+=R*$e,q(I,2*w+2*E+2)}for(T=0;T<_;T++)I[T]=I[2*T+1]<<16|I[2*T];for(T=_;T<2*_;T++)I[T]=0;return new o(I,0)};function q(T,_){for(;(T[_]&65535)!=T[_];)T[_+1]+=T[_]>>>16,T[_]&=65535,_++}function U(T,_){this.g=T,this.h=_}function G(T,_){if(C(_))throw Error("division by zero");if(C(T))return new U(p,p);if(V(T))return _=G(D(T),_),new U(D(_.g),D(_.h));if(V(_))return _=G(T,D(_)),new U(D(_.g),_.h);if(T.g.length>30){if(V(T)||V(_))throw Error("slowDivide_ only works with positive integers.");for(var I=g,w=_;w.l(T)<=0;)I=Z(I),w=Z(w);var E=Q(I,1),R=Q(w,1);for(w=Q(w,2),I=Q(I,2);!C(w);){var y=R.add(w);y.l(T)<=0&&(E=E.add(I),R=y),w=Q(w,1),I=Q(I,1)}return _=j(T,E.j(_)),new U(E,_)}for(E=p;T.l(_)>=0;){for(I=Math.max(1,Math.floor(T.m()/_.m())),w=Math.ceil(Math.log(I)/Math.LN2),w=w<=48?1:Math.pow(2,w-48),R=l(I),y=R.j(_);V(y)||y.l(T)>0;)I-=w,R=l(I),y=R.j(_);C(R)&&(R=g),E=E.add(R),T=j(T,y)}return new U(E,T)}n.B=function(T){return G(this,T).h},n.and=function(T){const _=Math.max(this.g.length,T.g.length),I=[];for(let w=0;w<_;w++)I[w]=this.i(w)&T.i(w);return new o(I,this.h&T.h)},n.or=function(T){const _=Math.max(this.g.length,T.g.length),I=[];for(let w=0;w<_;w++)I[w]=this.i(w)|T.i(w);return new o(I,this.h|T.h)},n.xor=function(T){const _=Math.max(this.g.length,T.g.length),I=[];for(let w=0;w<_;w++)I[w]=this.i(w)^T.i(w);return new o(I,this.h^T.h)};function Z(T){const _=T.g.length+1,I=[];for(let w=0;w<_;w++)I[w]=T.i(w)<<1|T.i(w-1)>>>31;return new o(I,T.h)}function Q(T,_){const I=_>>5;_%=32;const w=T.g.length-I,E=[];for(let R=0;R<w;R++)E[R]=_>0?T.i(R+I)>>>_|T.i(R+I+1)<<32-_:T.i(R+I);return new o(E,T.h)}r.prototype.digest=r.prototype.A,r.prototype.reset=r.prototype.u,r.prototype.update=r.prototype.v,fm=r,o.prototype.add=o.prototype.add,o.prototype.multiply=o.prototype.j,o.prototype.modulo=o.prototype.B,o.prototype.compare=o.prototype.l,o.prototype.toNumber=o.prototype.m,o.prototype.toString=o.prototype.toString,o.prototype.getBits=o.prototype.i,o.fromNumber=l,o.fromString=f,an=o}).apply(typeof Cd<"u"?Cd:typeof self<"u"?self:typeof window<"u"?window:{});var eo=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var pm,Oi,mm,fo,Gc,gm,_m,ym;(function(){var n,e=Object.defineProperty;function t(a){a=[typeof globalThis=="object"&&globalThis,a,typeof window=="object"&&window,typeof self=="object"&&self,typeof eo=="object"&&eo];for(var h=0;h<a.length;++h){var d=a[h];if(d&&d.Math==Math)return d}throw Error("Cannot find global object")}var r=t(this);function i(a,h){if(h)e:{var d=r;a=a.split(".");for(var m=0;m<a.length-1;m++){var b=a[m];if(!(b in d))break e;d=d[b]}a=a[a.length-1],m=d[a],h=h(m),h!=m&&h!=null&&e(d,a,{configurable:!0,writable:!0,value:h})}}i("Symbol.dispose",function(a){return a||Symbol("Symbol.dispose")}),i("Array.prototype.values",function(a){return a||function(){return this[Symbol.iterator]()}}),i("Object.entries",function(a){return a||function(h){var d=[],m;for(m in h)Object.prototype.hasOwnProperty.call(h,m)&&d.push([m,h[m]]);return d}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var s=s||{},o=this||self;function c(a){var h=typeof a;return h=="object"&&a!=null||h=="function"}function u(a,h,d){return a.call.apply(a.bind,arguments)}function l(a,h,d){return l=u,l.apply(null,arguments)}function f(a,h){var d=Array.prototype.slice.call(arguments,1);return function(){var m=d.slice();return m.push.apply(m,arguments),a.apply(this,m)}}function p(a,h){function d(){}d.prototype=h.prototype,a.Z=h.prototype,a.prototype=new d,a.prototype.constructor=a,a.Ob=function(m,b,S){for(var O=Array(arguments.length-2),H=2;H<arguments.length;H++)O[H-2]=arguments[H];return h.prototype[b].apply(m,O)}}var g=typeof AsyncContext<"u"&&typeof AsyncContext.Snapshot=="function"?a=>a&&AsyncContext.Snapshot.wrap(a):a=>a;function A(a){const h=a.length;if(h>0){const d=Array(h);for(let m=0;m<h;m++)d[m]=a[m];return d}return[]}function C(a,h){for(let m=1;m<arguments.length;m++){const b=arguments[m];var d=typeof b;if(d=d!="object"?d:b?Array.isArray(b)?"array":d:"null",d=="array"||d=="object"&&typeof b.length=="number"){d=a.length||0;const S=b.length||0;a.length=d+S;for(let O=0;O<S;O++)a[d+O]=b[O]}else a.push(b)}}class V{constructor(h,d){this.i=h,this.j=d,this.h=0,this.g=null}get(){let h;return this.h>0?(this.h--,h=this.g,this.g=h.next,h.next=null):h=this.i(),h}}function D(a){o.setTimeout(()=>{throw a},0)}function j(){var a=T;let h=null;return a.g&&(h=a.g,a.g=a.g.next,a.g||(a.h=null),h.next=null),h}class q{constructor(){this.h=this.g=null}add(h,d){const m=U.get();m.set(h,d),this.h?this.h.next=m:this.g=m,this.h=m}}var U=new V(()=>new G,a=>a.reset());class G{constructor(){this.next=this.g=this.h=null}set(h,d){this.h=h,this.g=d,this.next=null}reset(){this.next=this.g=this.h=null}}let Z,Q=!1,T=new q,_=()=>{const a=Promise.resolve(void 0);Z=()=>{a.then(I)}};function I(){for(var a;a=j();){try{a.h.call(a.g)}catch(d){D(d)}var h=U;h.j(a),h.h<100&&(h.h++,a.next=h.g,h.g=a)}Q=!1}function w(){this.u=this.u,this.C=this.C}w.prototype.u=!1,w.prototype.dispose=function(){this.u||(this.u=!0,this.N())},w.prototype[Symbol.dispose]=function(){this.dispose()},w.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function E(a,h){this.type=a,this.g=this.target=h,this.defaultPrevented=!1}E.prototype.h=function(){this.defaultPrevented=!0};var R=(function(){if(!o.addEventListener||!Object.defineProperty)return!1;var a=!1,h=Object.defineProperty({},"passive",{get:function(){a=!0}});try{const d=()=>{};o.addEventListener("test",d,h),o.removeEventListener("test",d,h)}catch{}return a})();function y(a){return/^[\s\xa0]*$/.test(a)}function $e(a,h){E.call(this,a?a.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,a&&this.init(a,h)}p($e,E),$e.prototype.init=function(a,h){const d=this.type=a.type,m=a.changedTouches&&a.changedTouches.length?a.changedTouches[0]:null;this.target=a.target||a.srcElement,this.g=h,h=a.relatedTarget,h||(d=="mouseover"?h=a.fromElement:d=="mouseout"&&(h=a.toElement)),this.relatedTarget=h,m?(this.clientX=m.clientX!==void 0?m.clientX:m.pageX,this.clientY=m.clientY!==void 0?m.clientY:m.pageY,this.screenX=m.screenX||0,this.screenY=m.screenY||0):(this.clientX=a.clientX!==void 0?a.clientX:a.pageX,this.clientY=a.clientY!==void 0?a.clientY:a.pageY,this.screenX=a.screenX||0,this.screenY=a.screenY||0),this.button=a.button,this.key=a.key||"",this.ctrlKey=a.ctrlKey,this.altKey=a.altKey,this.shiftKey=a.shiftKey,this.metaKey=a.metaKey,this.pointerId=a.pointerId||0,this.pointerType=a.pointerType,this.state=a.state,this.i=a,a.defaultPrevented&&$e.Z.h.call(this)},$e.prototype.h=function(){$e.Z.h.call(this);const a=this.i;a.preventDefault?a.preventDefault():a.returnValue=!1};var bn="closure_listenable_"+(Math.random()*1e6|0),CI=0;function kI(a,h,d,m,b){this.listener=a,this.proxy=null,this.src=h,this.type=d,this.capture=!!m,this.ha=b,this.key=++CI,this.da=this.fa=!1}function Us(a){a.da=!0,a.listener=null,a.proxy=null,a.src=null,a.ha=null}function Bs(a,h,d){for(const m in a)h.call(d,a[m],m,a)}function DI(a,h){for(const d in a)h.call(void 0,a[d],d,a)}function gh(a){const h={};for(const d in a)h[d]=a[d];return h}const _h="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function yh(a,h){let d,m;for(let b=1;b<arguments.length;b++){m=arguments[b];for(d in m)a[d]=m[d];for(let S=0;S<_h.length;S++)d=_h[S],Object.prototype.hasOwnProperty.call(m,d)&&(a[d]=m[d])}}function $s(a){this.src=a,this.g={},this.h=0}$s.prototype.add=function(a,h,d,m,b){const S=a.toString();a=this.g[S],a||(a=this.g[S]=[],this.h++);const O=ja(a,h,m,b);return O>-1?(h=a[O],d||(h.fa=!1)):(h=new kI(h,this.src,S,!!m,b),h.fa=d,a.push(h)),h};function qa(a,h){const d=h.type;if(d in a.g){var m=a.g[d],b=Array.prototype.indexOf.call(m,h,void 0),S;(S=b>=0)&&Array.prototype.splice.call(m,b,1),S&&(Us(h),a.g[d].length==0&&(delete a.g[d],a.h--))}}function ja(a,h,d,m){for(let b=0;b<a.length;++b){const S=a[b];if(!S.da&&S.listener==h&&S.capture==!!d&&S.ha==m)return b}return-1}var za="closure_lm_"+(Math.random()*1e6|0),Ga={};function Ih(a,h,d,m,b){if(Array.isArray(h)){for(let S=0;S<h.length;S++)Ih(a,h[S],d,m,b);return null}return d=wh(d),a&&a[bn]?a.J(h,d,c(m)?!!m.capture:!1,b):NI(a,h,d,!1,m,b)}function NI(a,h,d,m,b,S){if(!h)throw Error("Invalid event type");const O=c(b)?!!b.capture:!!b;let H=Ha(a);if(H||(a[za]=H=new $s(a)),d=H.add(h,d,m,O,S),d.proxy)return d;if(m=VI(),d.proxy=m,m.src=a,m.listener=d,a.addEventListener)R||(b=O),b===void 0&&(b=!1),a.addEventListener(h.toString(),m,b);else if(a.attachEvent)a.attachEvent(Eh(h.toString()),m);else if(a.addListener&&a.removeListener)a.addListener(m);else throw Error("addEventListener and attachEvent are unavailable.");return d}function VI(){function a(d){return h.call(a.src,a.listener,d)}const h=OI;return a}function Th(a,h,d,m,b){if(Array.isArray(h))for(var S=0;S<h.length;S++)Th(a,h[S],d,m,b);else m=c(m)?!!m.capture:!!m,d=wh(d),a&&a[bn]?(a=a.i,S=String(h).toString(),S in a.g&&(h=a.g[S],d=ja(h,d,m,b),d>-1&&(Us(h[d]),Array.prototype.splice.call(h,d,1),h.length==0&&(delete a.g[S],a.h--)))):a&&(a=Ha(a))&&(h=a.g[h.toString()],a=-1,h&&(a=ja(h,d,m,b)),(d=a>-1?h[a]:null)&&Ka(d))}function Ka(a){if(typeof a!="number"&&a&&!a.da){var h=a.src;if(h&&h[bn])qa(h.i,a);else{var d=a.type,m=a.proxy;h.removeEventListener?h.removeEventListener(d,m,a.capture):h.detachEvent?h.detachEvent(Eh(d),m):h.addListener&&h.removeListener&&h.removeListener(m),(d=Ha(h))?(qa(d,a),d.h==0&&(d.src=null,h[za]=null)):Us(a)}}}function Eh(a){return a in Ga?Ga[a]:Ga[a]="on"+a}function OI(a,h){if(a.da)a=!0;else{h=new $e(h,this);const d=a.listener,m=a.ha||a.src;a.fa&&Ka(a),a=d.call(m,h)}return a}function Ha(a){return a=a[za],a instanceof $s?a:null}var Wa="__closure_events_fn_"+(Math.random()*1e9>>>0);function wh(a){return typeof a=="function"?a:(a[Wa]||(a[Wa]=function(h){return a.handleEvent(h)}),a[Wa])}function Ce(){w.call(this),this.i=new $s(this),this.M=this,this.G=null}p(Ce,w),Ce.prototype[bn]=!0,Ce.prototype.removeEventListener=function(a,h,d,m){Th(this,a,h,d,m)};function Me(a,h){var d,m=a.G;if(m)for(d=[];m;m=m.G)d.push(m);if(a=a.M,m=h.type||h,typeof h=="string")h=new E(h,a);else if(h instanceof E)h.target=h.target||a;else{var b=h;h=new E(m,a),yh(h,b)}b=!0;let S,O;if(d)for(O=d.length-1;O>=0;O--)S=h.g=d[O],b=qs(S,m,!0,h)&&b;if(S=h.g=a,b=qs(S,m,!0,h)&&b,b=qs(S,m,!1,h)&&b,d)for(O=0;O<d.length;O++)S=h.g=d[O],b=qs(S,m,!1,h)&&b}Ce.prototype.N=function(){if(Ce.Z.N.call(this),this.i){var a=this.i;for(const h in a.g){const d=a.g[h];for(let m=0;m<d.length;m++)Us(d[m]);delete a.g[h],a.h--}}this.G=null},Ce.prototype.J=function(a,h,d,m){return this.i.add(String(a),h,!1,d,m)},Ce.prototype.K=function(a,h,d,m){return this.i.add(String(a),h,!0,d,m)};function qs(a,h,d,m){if(h=a.i.g[String(h)],!h)return!0;h=h.concat();let b=!0;for(let S=0;S<h.length;++S){const O=h[S];if(O&&!O.da&&O.capture==d){const H=O.listener,Ie=O.ha||O.src;O.fa&&qa(a.i,O),b=H.call(Ie,m)!==!1&&b}}return b&&!m.defaultPrevented}function xI(a,h){if(typeof a!="function")if(a&&typeof a.handleEvent=="function")a=l(a.handleEvent,a);else throw Error("Invalid listener argument");return Number(h)>2147483647?-1:o.setTimeout(a,h||0)}function vh(a){a.g=xI(()=>{a.g=null,a.i&&(a.i=!1,vh(a))},a.l);const h=a.h;a.h=null,a.m.apply(null,h)}class MI extends w{constructor(h,d){super(),this.m=h,this.l=d,this.h=null,this.i=!1,this.g=null}j(h){this.h=arguments,this.g?this.i=!0:vh(this)}N(){super.N(),this.g&&(o.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function ui(a){w.call(this),this.h=a,this.g={}}p(ui,w);var Ah=[];function bh(a){Bs(a.g,function(h,d){this.g.hasOwnProperty(d)&&Ka(h)},a),a.g={}}ui.prototype.N=function(){ui.Z.N.call(this),bh(this)},ui.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var Qa=o.JSON.stringify,LI=o.JSON.parse,FI=class{stringify(a){return o.JSON.stringify(a,void 0)}parse(a){return o.JSON.parse(a,void 0)}};function Rh(){}function Sh(){}var li={OPEN:"a",hb:"b",ERROR:"c",tb:"d"};function Ja(){E.call(this,"d")}p(Ja,E);function Ya(){E.call(this,"c")}p(Ya,E);var Rn={},Ph=null;function js(){return Ph=Ph||new Ce}Rn.Ia="serverreachability";function Ch(a){E.call(this,Rn.Ia,a)}p(Ch,E);function hi(a){const h=js();Me(h,new Ch(h))}Rn.STAT_EVENT="statevent";function kh(a,h){E.call(this,Rn.STAT_EVENT,a),this.stat=h}p(kh,E);function Le(a){const h=js();Me(h,new kh(h,a))}Rn.Ja="timingevent";function Dh(a,h){E.call(this,Rn.Ja,a),this.size=h}p(Dh,E);function di(a,h){if(typeof a!="function")throw Error("Fn must not be null and must be a function");return o.setTimeout(function(){a()},h)}function fi(){this.g=!0}fi.prototype.ua=function(){this.g=!1};function UI(a,h,d,m,b,S){a.info(function(){if(a.g)if(S){var O="",H=S.split("&");for(let ie=0;ie<H.length;ie++){var Ie=H[ie].split("=");if(Ie.length>1){const ve=Ie[0];Ie=Ie[1];const mt=ve.split("_");O=mt.length>=2&&mt[1]=="type"?O+(ve+"="+Ie+"&"):O+(ve+"=redacted&")}}}else O=null;else O=S;return"XMLHTTP REQ ("+m+") [attempt "+b+"]: "+h+`
`+d+`
`+O})}function BI(a,h,d,m,b,S,O){a.info(function(){return"XMLHTTP RESP ("+m+") [ attempt "+b+"]: "+h+`
`+d+`
`+S+" "+O})}function ar(a,h,d,m){a.info(function(){return"XMLHTTP TEXT ("+h+"): "+qI(a,d)+(m?" "+m:"")})}function $I(a,h){a.info(function(){return"TIMEOUT: "+h})}fi.prototype.info=function(){};function qI(a,h){if(!a.g)return h;if(!h)return null;try{const S=JSON.parse(h);if(S){for(a=0;a<S.length;a++)if(Array.isArray(S[a])){var d=S[a];if(!(d.length<2)){var m=d[1];if(Array.isArray(m)&&!(m.length<1)){var b=m[0];if(b!="noop"&&b!="stop"&&b!="close")for(let O=1;O<m.length;O++)m[O]=""}}}}return Qa(S)}catch{return h}}var zs={NO_ERROR:0,cb:1,qb:2,pb:3,kb:4,ob:5,rb:6,Ga:7,TIMEOUT:8,ub:9},Nh={ib:"complete",Fb:"success",ERROR:"error",Ga:"abort",xb:"ready",yb:"readystatechange",TIMEOUT:"timeout",sb:"incrementaldata",wb:"progress",lb:"downloadprogress",Nb:"uploadprogress"},Vh;function Xa(){}p(Xa,Rh),Xa.prototype.g=function(){return new XMLHttpRequest},Vh=new Xa;function pi(a){return encodeURIComponent(String(a))}function jI(a){var h=1;a=a.split(":");const d=[];for(;h>0&&a.length;)d.push(a.shift()),h--;return a.length&&d.push(a.join(":")),d}function Ut(a,h,d,m){this.j=a,this.i=h,this.l=d,this.S=m||1,this.V=new ui(this),this.H=45e3,this.J=null,this.o=!1,this.u=this.B=this.A=this.M=this.F=this.T=this.D=null,this.G=[],this.g=null,this.C=0,this.m=this.v=null,this.X=-1,this.K=!1,this.P=0,this.O=null,this.W=this.L=this.U=this.R=!1,this.h=new Oh}function Oh(){this.i=null,this.g="",this.h=!1}var xh={},Za={};function ec(a,h,d){a.M=1,a.A=Ks(pt(h)),a.u=d,a.R=!0,Mh(a,null)}function Mh(a,h){a.F=Date.now(),Gs(a),a.B=pt(a.A);var d=a.B,m=a.S;Array.isArray(m)||(m=[String(m)]),Qh(d.i,"t",m),a.C=0,d=a.j.L,a.h=new Oh,a.g=fd(a.j,d?h:null,!a.u),a.P>0&&(a.O=new MI(l(a.Y,a,a.g),a.P)),h=a.V,d=a.g,m=a.ba;var b="readystatechange";Array.isArray(b)||(b&&(Ah[0]=b.toString()),b=Ah);for(let S=0;S<b.length;S++){const O=Ih(d,b[S],m||h.handleEvent,!1,h.h||h);if(!O)break;h.g[O.key]=O}h=a.J?gh(a.J):{},a.u?(a.v||(a.v="POST"),h["Content-Type"]="application/x-www-form-urlencoded",a.g.ea(a.B,a.v,a.u,h)):(a.v="GET",a.g.ea(a.B,a.v,null,h)),hi(),UI(a.i,a.v,a.B,a.l,a.S,a.u)}Ut.prototype.ba=function(a){a=a.target;const h=this.O;h&&qt(a)==3?h.j():this.Y(a)},Ut.prototype.Y=function(a){try{if(a==this.g)e:{const H=qt(this.g),Ie=this.g.ya(),ie=this.g.ca();if(!(H<3)&&(H!=3||this.g&&(this.h.h||this.g.la()||nd(this.g)))){this.K||H!=4||Ie==7||(Ie==8||ie<=0?hi(3):hi(2)),tc(this);var h=this.g.ca();this.X=h;var d=zI(this);if(this.o=h==200,BI(this.i,this.v,this.B,this.l,this.S,H,h),this.o){if(this.U&&!this.L){t:{if(this.g){var m,b=this.g;if((m=b.g?b.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!y(m)){var S=m;break t}}S=null}if(a=S)ar(this.i,this.l,a,"Initial handshake response via X-HTTP-Initial-Response"),this.L=!0,nc(this,a);else{this.o=!1,this.m=3,Le(12),Sn(this),mi(this);break e}}if(this.R){a=!0;let ve;for(;!this.K&&this.C<d.length;)if(ve=GI(this,d),ve==Za){H==4&&(this.m=4,Le(14),a=!1),ar(this.i,this.l,null,"[Incomplete Response]");break}else if(ve==xh){this.m=4,Le(15),ar(this.i,this.l,d,"[Invalid Chunk]"),a=!1;break}else ar(this.i,this.l,ve,null),nc(this,ve);if(Lh(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),H!=4||d.length!=0||this.h.h||(this.m=1,Le(16),a=!1),this.o=this.o&&a,!a)ar(this.i,this.l,d,"[Invalid Chunked Response]"),Sn(this),mi(this);else if(d.length>0&&!this.W){this.W=!0;var O=this.j;O.g==this&&O.aa&&!O.P&&(O.j.info("Great, no buffering proxy detected. Bytes received: "+d.length),lc(O),O.P=!0,Le(11))}}else ar(this.i,this.l,d,null),nc(this,d);H==4&&Sn(this),this.o&&!this.K&&(H==4?ud(this.j,this):(this.o=!1,Gs(this)))}else sT(this.g),h==400&&d.indexOf("Unknown SID")>0?(this.m=3,Le(12)):(this.m=0,Le(13)),Sn(this),mi(this)}}}catch{}finally{}};function zI(a){if(!Lh(a))return a.g.la();const h=nd(a.g);if(h==="")return"";let d="";const m=h.length,b=qt(a.g)==4;if(!a.h.i){if(typeof TextDecoder>"u")return Sn(a),mi(a),"";a.h.i=new o.TextDecoder}for(let S=0;S<m;S++)a.h.h=!0,d+=a.h.i.decode(h[S],{stream:!(b&&S==m-1)});return h.length=0,a.h.g+=d,a.C=0,a.h.g}function Lh(a){return a.g?a.v=="GET"&&a.M!=2&&a.j.Aa:!1}function GI(a,h){var d=a.C,m=h.indexOf(`
`,d);return m==-1?Za:(d=Number(h.substring(d,m)),isNaN(d)?xh:(m+=1,m+d>h.length?Za:(h=h.slice(m,m+d),a.C=m+d,h)))}Ut.prototype.cancel=function(){this.K=!0,Sn(this)};function Gs(a){a.T=Date.now()+a.H,Fh(a,a.H)}function Fh(a,h){if(a.D!=null)throw Error("WatchDog timer not null");a.D=di(l(a.aa,a),h)}function tc(a){a.D&&(o.clearTimeout(a.D),a.D=null)}Ut.prototype.aa=function(){this.D=null;const a=Date.now();a-this.T>=0?($I(this.i,this.B),this.M!=2&&(hi(),Le(17)),Sn(this),this.m=2,mi(this)):Fh(this,this.T-a)};function mi(a){a.j.I==0||a.K||ud(a.j,a)}function Sn(a){tc(a);var h=a.O;h&&typeof h.dispose=="function"&&h.dispose(),a.O=null,bh(a.V),a.g&&(h=a.g,a.g=null,h.abort(),h.dispose())}function nc(a,h){try{var d=a.j;if(d.I!=0&&(d.g==a||rc(d.h,a))){if(!a.L&&rc(d.h,a)&&d.I==3){try{var m=d.Ba.g.parse(h)}catch{m=null}if(Array.isArray(m)&&m.length==3){var b=m;if(b[0]==0){e:if(!d.v){if(d.g)if(d.g.F+3e3<a.F)Ys(d),Qs(d);else break e;uc(d),Le(18)}}else d.xa=b[1],0<d.xa-d.K&&b[2]<37500&&d.F&&d.A==0&&!d.C&&(d.C=di(l(d.Va,d),6e3));$h(d.h)<=1&&d.ta&&(d.ta=void 0)}else Cn(d,11)}else if((a.L||d.g==a)&&Ys(d),!y(h))for(b=d.Ba.g.parse(h),h=0;h<b.length;h++){let ie=b[h];const ve=ie[0];if(!(ve<=d.K))if(d.K=ve,ie=ie[1],d.I==2)if(ie[0]=="c"){d.M=ie[1],d.ba=ie[2];const mt=ie[3];mt!=null&&(d.ka=mt,d.j.info("VER="+d.ka));const kn=ie[4];kn!=null&&(d.za=kn,d.j.info("SVER="+d.za));const jt=ie[5];jt!=null&&typeof jt=="number"&&jt>0&&(m=1.5*jt,d.O=m,d.j.info("backChannelRequestTimeoutMs_="+m)),m=d;const zt=a.g;if(zt){const Zs=zt.g?zt.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(Zs){var S=m.h;S.g||Zs.indexOf("spdy")==-1&&Zs.indexOf("quic")==-1&&Zs.indexOf("h2")==-1||(S.j=S.l,S.g=new Set,S.h&&(ic(S,S.h),S.h=null))}if(m.G){const hc=zt.g?zt.g.getResponseHeader("X-HTTP-Session-Id"):null;hc&&(m.wa=hc,oe(m.J,m.G,hc))}}d.I=3,d.l&&d.l.ra(),d.aa&&(d.T=Date.now()-a.F,d.j.info("Handshake RTT: "+d.T+"ms")),m=d;var O=a;if(m.na=dd(m,m.L?m.ba:null,m.W),O.L){qh(m.h,O);var H=O,Ie=m.O;Ie&&(H.H=Ie),H.D&&(tc(H),Gs(H)),m.g=O}else ad(m);d.i.length>0&&Js(d)}else ie[0]!="stop"&&ie[0]!="close"||Cn(d,7);else d.I==3&&(ie[0]=="stop"||ie[0]=="close"?ie[0]=="stop"?Cn(d,7):cc(d):ie[0]!="noop"&&d.l&&d.l.qa(ie),d.A=0)}}hi(4)}catch{}}var KI=class{constructor(a,h){this.g=a,this.map=h}};function Uh(a){this.l=a||10,o.PerformanceNavigationTiming?(a=o.performance.getEntriesByType("navigation"),a=a.length>0&&(a[0].nextHopProtocol=="hq"||a[0].nextHopProtocol=="h2")):a=!!(o.chrome&&o.chrome.loadTimes&&o.chrome.loadTimes()&&o.chrome.loadTimes().wasFetchedViaSpdy),this.j=a?this.l:1,this.g=null,this.j>1&&(this.g=new Set),this.h=null,this.i=[]}function Bh(a){return a.h?!0:a.g?a.g.size>=a.j:!1}function $h(a){return a.h?1:a.g?a.g.size:0}function rc(a,h){return a.h?a.h==h:a.g?a.g.has(h):!1}function ic(a,h){a.g?a.g.add(h):a.h=h}function qh(a,h){a.h&&a.h==h?a.h=null:a.g&&a.g.has(h)&&a.g.delete(h)}Uh.prototype.cancel=function(){if(this.i=jh(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const a of this.g.values())a.cancel();this.g.clear()}};function jh(a){if(a.h!=null)return a.i.concat(a.h.G);if(a.g!=null&&a.g.size!==0){let h=a.i;for(const d of a.g.values())h=h.concat(d.G);return h}return A(a.i)}var zh=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function HI(a,h){if(a){a=a.split("&");for(let d=0;d<a.length;d++){const m=a[d].indexOf("=");let b,S=null;m>=0?(b=a[d].substring(0,m),S=a[d].substring(m+1)):b=a[d],h(b,S?decodeURIComponent(S.replace(/\+/g," ")):"")}}}function Bt(a){this.g=this.o=this.j="",this.u=null,this.m=this.h="",this.l=!1;let h;a instanceof Bt?(this.l=a.l,gi(this,a.j),this.o=a.o,this.g=a.g,_i(this,a.u),this.h=a.h,sc(this,Jh(a.i)),this.m=a.m):a&&(h=String(a).match(zh))?(this.l=!1,gi(this,h[1]||"",!0),this.o=yi(h[2]||""),this.g=yi(h[3]||"",!0),_i(this,h[4]),this.h=yi(h[5]||"",!0),sc(this,h[6]||"",!0),this.m=yi(h[7]||"")):(this.l=!1,this.i=new Ti(null,this.l))}Bt.prototype.toString=function(){const a=[];var h=this.j;h&&a.push(Ii(h,Gh,!0),":");var d=this.g;return(d||h=="file")&&(a.push("//"),(h=this.o)&&a.push(Ii(h,Gh,!0),"@"),a.push(pi(d).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),d=this.u,d!=null&&a.push(":",String(d))),(d=this.h)&&(this.g&&d.charAt(0)!="/"&&a.push("/"),a.push(Ii(d,d.charAt(0)=="/"?JI:QI,!0))),(d=this.i.toString())&&a.push("?",d),(d=this.m)&&a.push("#",Ii(d,XI)),a.join("")},Bt.prototype.resolve=function(a){const h=pt(this);let d=!!a.j;d?gi(h,a.j):d=!!a.o,d?h.o=a.o:d=!!a.g,d?h.g=a.g:d=a.u!=null;var m=a.h;if(d)_i(h,a.u);else if(d=!!a.h){if(m.charAt(0)!="/")if(this.g&&!this.h)m="/"+m;else{var b=h.h.lastIndexOf("/");b!=-1&&(m=h.h.slice(0,b+1)+m)}if(b=m,b==".."||b==".")m="";else if(b.indexOf("./")!=-1||b.indexOf("/.")!=-1){m=b.lastIndexOf("/",0)==0,b=b.split("/");const S=[];for(let O=0;O<b.length;){const H=b[O++];H=="."?m&&O==b.length&&S.push(""):H==".."?((S.length>1||S.length==1&&S[0]!="")&&S.pop(),m&&O==b.length&&S.push("")):(S.push(H),m=!0)}m=S.join("/")}else m=b}return d?h.h=m:d=a.i.toString()!=="",d?sc(h,Jh(a.i)):d=!!a.m,d&&(h.m=a.m),h};function pt(a){return new Bt(a)}function gi(a,h,d){a.j=d?yi(h,!0):h,a.j&&(a.j=a.j.replace(/:$/,""))}function _i(a,h){if(h){if(h=Number(h),isNaN(h)||h<0)throw Error("Bad port number "+h);a.u=h}else a.u=null}function sc(a,h,d){h instanceof Ti?(a.i=h,ZI(a.i,a.l)):(d||(h=Ii(h,YI)),a.i=new Ti(h,a.l))}function oe(a,h,d){a.i.set(h,d)}function Ks(a){return oe(a,"zx",Math.floor(Math.random()*2147483648).toString(36)+Math.abs(Math.floor(Math.random()*2147483648)^Date.now()).toString(36)),a}function yi(a,h){return a?h?decodeURI(a.replace(/%25/g,"%2525")):decodeURIComponent(a):""}function Ii(a,h,d){return typeof a=="string"?(a=encodeURI(a).replace(h,WI),d&&(a=a.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),a):null}function WI(a){return a=a.charCodeAt(0),"%"+(a>>4&15).toString(16)+(a&15).toString(16)}var Gh=/[#\/\?@]/g,QI=/[#\?:]/g,JI=/[#\?]/g,YI=/[#\?@]/g,XI=/#/g;function Ti(a,h){this.h=this.g=null,this.i=a||null,this.j=!!h}function Pn(a){a.g||(a.g=new Map,a.h=0,a.i&&HI(a.i,function(h,d){a.add(decodeURIComponent(h.replace(/\+/g," ")),d)}))}n=Ti.prototype,n.add=function(a,h){Pn(this),this.i=null,a=cr(this,a);let d=this.g.get(a);return d||this.g.set(a,d=[]),d.push(h),this.h+=1,this};function Kh(a,h){Pn(a),h=cr(a,h),a.g.has(h)&&(a.i=null,a.h-=a.g.get(h).length,a.g.delete(h))}function Hh(a,h){return Pn(a),h=cr(a,h),a.g.has(h)}n.forEach=function(a,h){Pn(this),this.g.forEach(function(d,m){d.forEach(function(b){a.call(h,b,m,this)},this)},this)};function Wh(a,h){Pn(a);let d=[];if(typeof h=="string")Hh(a,h)&&(d=d.concat(a.g.get(cr(a,h))));else for(a=Array.from(a.g.values()),h=0;h<a.length;h++)d=d.concat(a[h]);return d}n.set=function(a,h){return Pn(this),this.i=null,a=cr(this,a),Hh(this,a)&&(this.h-=this.g.get(a).length),this.g.set(a,[h]),this.h+=1,this},n.get=function(a,h){return a?(a=Wh(this,a),a.length>0?String(a[0]):h):h};function Qh(a,h,d){Kh(a,h),d.length>0&&(a.i=null,a.g.set(cr(a,h),A(d)),a.h+=d.length)}n.toString=function(){if(this.i)return this.i;if(!this.g)return"";const a=[],h=Array.from(this.g.keys());for(let m=0;m<h.length;m++){var d=h[m];const b=pi(d);d=Wh(this,d);for(let S=0;S<d.length;S++){let O=b;d[S]!==""&&(O+="="+pi(d[S])),a.push(O)}}return this.i=a.join("&")};function Jh(a){const h=new Ti;return h.i=a.i,a.g&&(h.g=new Map(a.g),h.h=a.h),h}function cr(a,h){return h=String(h),a.j&&(h=h.toLowerCase()),h}function ZI(a,h){h&&!a.j&&(Pn(a),a.i=null,a.g.forEach(function(d,m){const b=m.toLowerCase();m!=b&&(Kh(this,m),Qh(this,b,d))},a)),a.j=h}function eT(a,h){const d=new fi;if(o.Image){const m=new Image;m.onload=f($t,d,"TestLoadImage: loaded",!0,h,m),m.onerror=f($t,d,"TestLoadImage: error",!1,h,m),m.onabort=f($t,d,"TestLoadImage: abort",!1,h,m),m.ontimeout=f($t,d,"TestLoadImage: timeout",!1,h,m),o.setTimeout(function(){m.ontimeout&&m.ontimeout()},1e4),m.src=a}else h(!1)}function tT(a,h){const d=new fi,m=new AbortController,b=setTimeout(()=>{m.abort(),$t(d,"TestPingServer: timeout",!1,h)},1e4);fetch(a,{signal:m.signal}).then(S=>{clearTimeout(b),S.ok?$t(d,"TestPingServer: ok",!0,h):$t(d,"TestPingServer: server error",!1,h)}).catch(()=>{clearTimeout(b),$t(d,"TestPingServer: error",!1,h)})}function $t(a,h,d,m,b){try{b&&(b.onload=null,b.onerror=null,b.onabort=null,b.ontimeout=null),m(d)}catch{}}function nT(){this.g=new FI}function oc(a){this.i=a.Sb||null,this.h=a.ab||!1}p(oc,Rh),oc.prototype.g=function(){return new Hs(this.i,this.h)};function Hs(a,h){Ce.call(this),this.H=a,this.o=h,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.A=new Headers,this.h=null,this.F="GET",this.D="",this.g=!1,this.B=this.j=this.l=null,this.v=new AbortController}p(Hs,Ce),n=Hs.prototype,n.open=function(a,h){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.F=a,this.D=h,this.readyState=1,wi(this)},n.send=function(a){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");if(this.v.signal.aborted)throw this.abort(),Error("Request was aborted.");this.g=!0;const h={headers:this.A,method:this.F,credentials:this.m,cache:void 0,signal:this.v.signal};a&&(h.body=a),(this.H||o).fetch(new Request(this.D,h)).then(this.Pa.bind(this),this.ga.bind(this))},n.abort=function(){this.response=this.responseText="",this.A=new Headers,this.status=0,this.v.abort(),this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),this.readyState>=1&&this.g&&this.readyState!=4&&(this.g=!1,Ei(this)),this.readyState=0},n.Pa=function(a){if(this.g&&(this.l=a,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=a.headers,this.readyState=2,wi(this)),this.g&&(this.readyState=3,wi(this),this.g)))if(this.responseType==="arraybuffer")a.arrayBuffer().then(this.Na.bind(this),this.ga.bind(this));else if(typeof o.ReadableStream<"u"&&"body"in a){if(this.j=a.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.B=new TextDecoder;Yh(this)}else a.text().then(this.Oa.bind(this),this.ga.bind(this))};function Yh(a){a.j.read().then(a.Ma.bind(a)).catch(a.ga.bind(a))}n.Ma=function(a){if(this.g){if(this.o&&a.value)this.response.push(a.value);else if(!this.o){var h=a.value?a.value:new Uint8Array(0);(h=this.B.decode(h,{stream:!a.done}))&&(this.response=this.responseText+=h)}a.done?Ei(this):wi(this),this.readyState==3&&Yh(this)}},n.Oa=function(a){this.g&&(this.response=this.responseText=a,Ei(this))},n.Na=function(a){this.g&&(this.response=a,Ei(this))},n.ga=function(){this.g&&Ei(this)};function Ei(a){a.readyState=4,a.l=null,a.j=null,a.B=null,wi(a)}n.setRequestHeader=function(a,h){this.A.append(a,h)},n.getResponseHeader=function(a){return this.h&&this.h.get(a.toLowerCase())||""},n.getAllResponseHeaders=function(){if(!this.h)return"";const a=[],h=this.h.entries();for(var d=h.next();!d.done;)d=d.value,a.push(d[0]+": "+d[1]),d=h.next();return a.join(`\r
`)};function wi(a){a.onreadystatechange&&a.onreadystatechange.call(a)}Object.defineProperty(Hs.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(a){this.m=a?"include":"same-origin"}});function Xh(a){let h="";return Bs(a,function(d,m){h+=m,h+=":",h+=d,h+=`\r
`}),h}function ac(a,h,d){e:{for(m in d){var m=!1;break e}m=!0}m||(d=Xh(d),typeof a=="string"?d!=null&&pi(d):oe(a,h,d))}function de(a){Ce.call(this),this.headers=new Map,this.L=a||null,this.h=!1,this.g=null,this.D="",this.o=0,this.l="",this.j=this.B=this.v=this.A=!1,this.m=null,this.F="",this.H=!1}p(de,Ce);var rT=/^https?$/i,iT=["POST","PUT"];n=de.prototype,n.Fa=function(a){this.H=a},n.ea=function(a,h,d,m){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+a);h=h?h.toUpperCase():"GET",this.D=a,this.l="",this.o=0,this.A=!1,this.h=!0,this.g=this.L?this.L.g():Vh.g(),this.g.onreadystatechange=g(l(this.Ca,this));try{this.B=!0,this.g.open(h,String(a),!0),this.B=!1}catch(S){Zh(this,S);return}if(a=d||"",d=new Map(this.headers),m)if(Object.getPrototypeOf(m)===Object.prototype)for(var b in m)d.set(b,m[b]);else if(typeof m.keys=="function"&&typeof m.get=="function")for(const S of m.keys())d.set(S,m.get(S));else throw Error("Unknown input type for opt_headers: "+String(m));m=Array.from(d.keys()).find(S=>S.toLowerCase()=="content-type"),b=o.FormData&&a instanceof o.FormData,!(Array.prototype.indexOf.call(iT,h,void 0)>=0)||m||b||d.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[S,O]of d)this.g.setRequestHeader(S,O);this.F&&(this.g.responseType=this.F),"withCredentials"in this.g&&this.g.withCredentials!==this.H&&(this.g.withCredentials=this.H);try{this.m&&(clearTimeout(this.m),this.m=null),this.v=!0,this.g.send(a),this.v=!1}catch(S){Zh(this,S)}};function Zh(a,h){a.h=!1,a.g&&(a.j=!0,a.g.abort(),a.j=!1),a.l=h,a.o=5,ed(a),Ws(a)}function ed(a){a.A||(a.A=!0,Me(a,"complete"),Me(a,"error"))}n.abort=function(a){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.o=a||7,Me(this,"complete"),Me(this,"abort"),Ws(this))},n.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),Ws(this,!0)),de.Z.N.call(this)},n.Ca=function(){this.u||(this.B||this.v||this.j?td(this):this.Xa())},n.Xa=function(){td(this)};function td(a){if(a.h&&typeof s<"u"){if(a.v&&qt(a)==4)setTimeout(a.Ca.bind(a),0);else if(Me(a,"readystatechange"),qt(a)==4){a.h=!1;try{const S=a.ca();e:switch(S){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var h=!0;break e;default:h=!1}var d;if(!(d=h)){var m;if(m=S===0){let O=String(a.D).match(zh)[1]||null;!O&&o.self&&o.self.location&&(O=o.self.location.protocol.slice(0,-1)),m=!rT.test(O?O.toLowerCase():"")}d=m}if(d)Me(a,"complete"),Me(a,"success");else{a.o=6;try{var b=qt(a)>2?a.g.statusText:""}catch{b=""}a.l=b+" ["+a.ca()+"]",ed(a)}}finally{Ws(a)}}}}function Ws(a,h){if(a.g){a.m&&(clearTimeout(a.m),a.m=null);const d=a.g;a.g=null,h||Me(a,"ready");try{d.onreadystatechange=null}catch{}}}n.isActive=function(){return!!this.g};function qt(a){return a.g?a.g.readyState:0}n.ca=function(){try{return qt(this)>2?this.g.status:-1}catch{return-1}},n.la=function(){try{return this.g?this.g.responseText:""}catch{return""}},n.La=function(a){if(this.g){var h=this.g.responseText;return a&&h.indexOf(a)==0&&(h=h.substring(a.length)),LI(h)}};function nd(a){try{if(!a.g)return null;if("response"in a.g)return a.g.response;switch(a.F){case"":case"text":return a.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in a.g)return a.g.mozResponseArrayBuffer}return null}catch{return null}}function sT(a){const h={};a=(a.g&&qt(a)>=2&&a.g.getAllResponseHeaders()||"").split(`\r
`);for(let m=0;m<a.length;m++){if(y(a[m]))continue;var d=jI(a[m]);const b=d[0];if(d=d[1],typeof d!="string")continue;d=d.trim();const S=h[b]||[];h[b]=S,S.push(d)}DI(h,function(m){return m.join(", ")})}n.ya=function(){return this.o},n.Ha=function(){return typeof this.l=="string"?this.l:String(this.l)};function vi(a,h,d){return d&&d.internalChannelParams&&d.internalChannelParams[a]||h}function rd(a){this.za=0,this.i=[],this.j=new fi,this.ba=this.na=this.J=this.W=this.g=this.wa=this.G=this.H=this.u=this.U=this.o=null,this.Ya=this.V=0,this.Sa=vi("failFast",!1,a),this.F=this.C=this.v=this.m=this.l=null,this.X=!0,this.xa=this.K=-1,this.Y=this.A=this.D=0,this.Qa=vi("baseRetryDelayMs",5e3,a),this.Za=vi("retryDelaySeedMs",1e4,a),this.Ta=vi("forwardChannelMaxRetries",2,a),this.va=vi("forwardChannelRequestTimeoutMs",2e4,a),this.ma=a&&a.xmlHttpFactory||void 0,this.Ua=a&&a.Rb||void 0,this.Aa=a&&a.useFetchStreams||!1,this.O=void 0,this.L=a&&a.supportsCrossDomainXhr||!1,this.M="",this.h=new Uh(a&&a.concurrentRequestLimit),this.Ba=new nT,this.S=a&&a.fastHandshake||!1,this.R=a&&a.encodeInitMessageHeaders||!1,this.S&&this.R&&(this.R=!1),this.Ra=a&&a.Pb||!1,a&&a.ua&&this.j.ua(),a&&a.forceLongPolling&&(this.X=!1),this.aa=!this.S&&this.X&&a&&a.detectBufferingProxy||!1,this.ia=void 0,a&&a.longPollingTimeout&&a.longPollingTimeout>0&&(this.ia=a.longPollingTimeout),this.ta=void 0,this.T=0,this.P=!1,this.ja=this.B=null}n=rd.prototype,n.ka=8,n.I=1,n.connect=function(a,h,d,m){Le(0),this.W=a,this.H=h||{},d&&m!==void 0&&(this.H.OSID=d,this.H.OAID=m),this.F=this.X,this.J=dd(this,null,this.W),Js(this)};function cc(a){if(id(a),a.I==3){var h=a.V++,d=pt(a.J);if(oe(d,"SID",a.M),oe(d,"RID",h),oe(d,"TYPE","terminate"),Ai(a,d),h=new Ut(a,a.j,h),h.M=2,h.A=Ks(pt(d)),d=!1,o.navigator&&o.navigator.sendBeacon)try{d=o.navigator.sendBeacon(h.A.toString(),"")}catch{}!d&&o.Image&&(new Image().src=h.A,d=!0),d||(h.g=fd(h.j,null),h.g.ea(h.A)),h.F=Date.now(),Gs(h)}hd(a)}function Qs(a){a.g&&(lc(a),a.g.cancel(),a.g=null)}function id(a){Qs(a),a.v&&(o.clearTimeout(a.v),a.v=null),Ys(a),a.h.cancel(),a.m&&(typeof a.m=="number"&&o.clearTimeout(a.m),a.m=null)}function Js(a){if(!Bh(a.h)&&!a.m){a.m=!0;var h=a.Ea;Z||_(),Q||(Z(),Q=!0),T.add(h,a),a.D=0}}function oT(a,h){return $h(a.h)>=a.h.j-(a.m?1:0)?!1:a.m?(a.i=h.G.concat(a.i),!0):a.I==1||a.I==2||a.D>=(a.Sa?0:a.Ta)?!1:(a.m=di(l(a.Ea,a,h),ld(a,a.D)),a.D++,!0)}n.Ea=function(a){if(this.m)if(this.m=null,this.I==1){if(!a){this.V=Math.floor(Math.random()*1e5),a=this.V++;const b=new Ut(this,this.j,a);let S=this.o;if(this.U&&(S?(S=gh(S),yh(S,this.U)):S=this.U),this.u!==null||this.R||(b.J=S,S=null),this.S)e:{for(var h=0,d=0;d<this.i.length;d++){t:{var m=this.i[d];if("__data__"in m.map&&(m=m.map.__data__,typeof m=="string")){m=m.length;break t}m=void 0}if(m===void 0)break;if(h+=m,h>4096){h=d;break e}if(h===4096||d===this.i.length-1){h=d+1;break e}}h=1e3}else h=1e3;h=od(this,b,h),d=pt(this.J),oe(d,"RID",a),oe(d,"CVER",22),this.G&&oe(d,"X-HTTP-Session-Id",this.G),Ai(this,d),S&&(this.R?h="headers="+pi(Xh(S))+"&"+h:this.u&&ac(d,this.u,S)),ic(this.h,b),this.Ra&&oe(d,"TYPE","init"),this.S?(oe(d,"$req",h),oe(d,"SID","null"),b.U=!0,ec(b,d,null)):ec(b,d,h),this.I=2}}else this.I==3&&(a?sd(this,a):this.i.length==0||Bh(this.h)||sd(this))};function sd(a,h){var d;h?d=h.l:d=a.V++;const m=pt(a.J);oe(m,"SID",a.M),oe(m,"RID",d),oe(m,"AID",a.K),Ai(a,m),a.u&&a.o&&ac(m,a.u,a.o),d=new Ut(a,a.j,d,a.D+1),a.u===null&&(d.J=a.o),h&&(a.i=h.G.concat(a.i)),h=od(a,d,1e3),d.H=Math.round(a.va*.5)+Math.round(a.va*.5*Math.random()),ic(a.h,d),ec(d,m,h)}function Ai(a,h){a.H&&Bs(a.H,function(d,m){oe(h,m,d)}),a.l&&Bs({},function(d,m){oe(h,m,d)})}function od(a,h,d){d=Math.min(a.i.length,d);const m=a.l?l(a.l.Ka,a.l,a):null;e:{var b=a.i;let H=-1;for(;;){const Ie=["count="+d];H==-1?d>0?(H=b[0].g,Ie.push("ofs="+H)):H=0:Ie.push("ofs="+H);let ie=!0;for(let ve=0;ve<d;ve++){var S=b[ve].g;const mt=b[ve].map;if(S-=H,S<0)H=Math.max(0,b[ve].g-100),ie=!1;else try{S="req"+S+"_"||"";try{var O=mt instanceof Map?mt:Object.entries(mt);for(const[kn,jt]of O){let zt=jt;c(jt)&&(zt=Qa(jt)),Ie.push(S+kn+"="+encodeURIComponent(zt))}}catch(kn){throw Ie.push(S+"type="+encodeURIComponent("_badmap")),kn}}catch{m&&m(mt)}}if(ie){O=Ie.join("&");break e}}O=void 0}return a=a.i.splice(0,d),h.G=a,O}function ad(a){if(!a.g&&!a.v){a.Y=1;var h=a.Da;Z||_(),Q||(Z(),Q=!0),T.add(h,a),a.A=0}}function uc(a){return a.g||a.v||a.A>=3?!1:(a.Y++,a.v=di(l(a.Da,a),ld(a,a.A)),a.A++,!0)}n.Da=function(){if(this.v=null,cd(this),this.aa&&!(this.P||this.g==null||this.T<=0)){var a=4*this.T;this.j.info("BP detection timer enabled: "+a),this.B=di(l(this.Wa,this),a)}},n.Wa=function(){this.B&&(this.B=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.P=!0,Le(10),Qs(this),cd(this))};function lc(a){a.B!=null&&(o.clearTimeout(a.B),a.B=null)}function cd(a){a.g=new Ut(a,a.j,"rpc",a.Y),a.u===null&&(a.g.J=a.o),a.g.P=0;var h=pt(a.na);oe(h,"RID","rpc"),oe(h,"SID",a.M),oe(h,"AID",a.K),oe(h,"CI",a.F?"0":"1"),!a.F&&a.ia&&oe(h,"TO",a.ia),oe(h,"TYPE","xmlhttp"),Ai(a,h),a.u&&a.o&&ac(h,a.u,a.o),a.O&&(a.g.H=a.O);var d=a.g;a=a.ba,d.M=1,d.A=Ks(pt(h)),d.u=null,d.R=!0,Mh(d,a)}n.Va=function(){this.C!=null&&(this.C=null,Qs(this),uc(this),Le(19))};function Ys(a){a.C!=null&&(o.clearTimeout(a.C),a.C=null)}function ud(a,h){var d=null;if(a.g==h){Ys(a),lc(a),a.g=null;var m=2}else if(rc(a.h,h))d=h.G,qh(a.h,h),m=1;else return;if(a.I!=0){if(h.o)if(m==1){d=h.u?h.u.length:0,h=Date.now()-h.F;var b=a.D;m=js(),Me(m,new Dh(m,d)),Js(a)}else ad(a);else if(b=h.m,b==3||b==0&&h.X>0||!(m==1&&oT(a,h)||m==2&&uc(a)))switch(d&&d.length>0&&(h=a.h,h.i=h.i.concat(d)),b){case 1:Cn(a,5);break;case 4:Cn(a,10);break;case 3:Cn(a,6);break;default:Cn(a,2)}}}function ld(a,h){let d=a.Qa+Math.floor(Math.random()*a.Za);return a.isActive()||(d*=2),d*h}function Cn(a,h){if(a.j.info("Error code "+h),h==2){var d=l(a.bb,a),m=a.Ua;const b=!m;m=new Bt(m||"//www.google.com/images/cleardot.gif"),o.location&&o.location.protocol=="http"||gi(m,"https"),Ks(m),b?eT(m.toString(),d):tT(m.toString(),d)}else Le(2);a.I=0,a.l&&a.l.pa(h),hd(a),id(a)}n.bb=function(a){a?(this.j.info("Successfully pinged google.com"),Le(2)):(this.j.info("Failed to ping google.com"),Le(1))};function hd(a){if(a.I=0,a.ja=[],a.l){const h=jh(a.h);(h.length!=0||a.i.length!=0)&&(C(a.ja,h),C(a.ja,a.i),a.h.i.length=0,A(a.i),a.i.length=0),a.l.oa()}}function dd(a,h,d){var m=d instanceof Bt?pt(d):new Bt(d);if(m.g!="")h&&(m.g=h+"."+m.g),_i(m,m.u);else{var b=o.location;m=b.protocol,h=h?h+"."+b.hostname:b.hostname,b=+b.port;const S=new Bt(null);m&&gi(S,m),h&&(S.g=h),b&&_i(S,b),d&&(S.h=d),m=S}return d=a.G,h=a.wa,d&&h&&oe(m,d,h),oe(m,"VER",a.ka),Ai(a,m),m}function fd(a,h,d){if(h&&!a.L)throw Error("Can't create secondary domain capable XhrIo object.");return h=a.Aa&&!a.ma?new de(new oc({ab:d})):new de(a.ma),h.Fa(a.L),h}n.isActive=function(){return!!this.l&&this.l.isActive(this)};function pd(){}n=pd.prototype,n.ra=function(){},n.qa=function(){},n.pa=function(){},n.oa=function(){},n.isActive=function(){return!0},n.Ka=function(){};function Xs(){}Xs.prototype.g=function(a,h){return new He(a,h)};function He(a,h){Ce.call(this),this.g=new rd(h),this.l=a,this.h=h&&h.messageUrlParams||null,a=h&&h.messageHeaders||null,h&&h.clientProtocolHeaderRequired&&(a?a["X-Client-Protocol"]="webchannel":a={"X-Client-Protocol":"webchannel"}),this.g.o=a,a=h&&h.initMessageHeaders||null,h&&h.messageContentType&&(a?a["X-WebChannel-Content-Type"]=h.messageContentType:a={"X-WebChannel-Content-Type":h.messageContentType}),h&&h.sa&&(a?a["X-WebChannel-Client-Profile"]=h.sa:a={"X-WebChannel-Client-Profile":h.sa}),this.g.U=a,(a=h&&h.Qb)&&!y(a)&&(this.g.u=a),this.A=h&&h.supportsCrossDomainXhr||!1,this.v=h&&h.sendRawJson||!1,(h=h&&h.httpSessionIdParam)&&!y(h)&&(this.g.G=h,a=this.h,a!==null&&h in a&&(a=this.h,h in a&&delete a[h])),this.j=new ur(this)}p(He,Ce),He.prototype.m=function(){this.g.l=this.j,this.A&&(this.g.L=!0),this.g.connect(this.l,this.h||void 0)},He.prototype.close=function(){cc(this.g)},He.prototype.o=function(a){var h=this.g;if(typeof a=="string"){var d={};d.__data__=a,a=d}else this.v&&(d={},d.__data__=Qa(a),a=d);h.i.push(new KI(h.Ya++,a)),h.I==3&&Js(h)},He.prototype.N=function(){this.g.l=null,delete this.j,cc(this.g),delete this.g,He.Z.N.call(this)};function md(a){Ja.call(this),a.__headers__&&(this.headers=a.__headers__,this.statusCode=a.__status__,delete a.__headers__,delete a.__status__);var h=a.__sm__;if(h){e:{for(const d in h){a=d;break e}a=void 0}(this.i=a)&&(a=this.i,h=h!==null&&a in h?h[a]:void 0),this.data=h}else this.data=a}p(md,Ja);function gd(){Ya.call(this),this.status=1}p(gd,Ya);function ur(a){this.g=a}p(ur,pd),ur.prototype.ra=function(){Me(this.g,"a")},ur.prototype.qa=function(a){Me(this.g,new md(a))},ur.prototype.pa=function(a){Me(this.g,new gd)},ur.prototype.oa=function(){Me(this.g,"b")},Xs.prototype.createWebChannel=Xs.prototype.g,He.prototype.send=He.prototype.o,He.prototype.open=He.prototype.m,He.prototype.close=He.prototype.close,ym=function(){return new Xs},_m=function(){return js()},gm=Rn,Gc={jb:0,mb:1,nb:2,Hb:3,Mb:4,Jb:5,Kb:6,Ib:7,Gb:8,Lb:9,PROXY:10,NOPROXY:11,Eb:12,Ab:13,Bb:14,zb:15,Cb:16,Db:17,fb:18,eb:19,gb:20},zs.NO_ERROR=0,zs.TIMEOUT=8,zs.HTTP_ERROR=6,fo=zs,Nh.COMPLETE="complete",mm=Nh,Sh.EventType=li,li.OPEN="a",li.CLOSE="b",li.ERROR="c",li.MESSAGE="d",Ce.prototype.listen=Ce.prototype.J,Oi=Sh,de.prototype.listenOnce=de.prototype.K,de.prototype.getLastError=de.prototype.Ha,de.prototype.getLastErrorCode=de.prototype.ya,de.prototype.getStatus=de.prototype.ca,de.prototype.getResponseJson=de.prototype.La,de.prototype.getResponseText=de.prototype.la,de.prototype.send=de.prototype.ea,de.prototype.setWithCredentials=de.prototype.Fa,pm=de}).apply(typeof eo<"u"?eo:typeof self<"u"?self:typeof window<"u"?window:{});/**
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
 */class De{constructor(e){this.uid=e}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}}De.UNAUTHENTICATED=new De(null),De.GOOGLE_CREDENTIALS=new De("google-credentials-uid"),De.FIRST_PARTY=new De("first-party-uid"),De.MOCK_USER=new De("mock-user");/**
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
 */let Xr="12.9.0";function $E(n){Xr=n}/**
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
 */const Kn=new Is("@firebase/firestore");function gr(){return Kn.logLevel}function k(n,...e){if(Kn.logLevel<=J.DEBUG){const t=e.map(Mu);Kn.debug(`Firestore (${Xr}): ${n}`,...t)}}function me(n,...e){if(Kn.logLevel<=J.ERROR){const t=e.map(Mu);Kn.error(`Firestore (${Xr}): ${n}`,...t)}}function Dr(n,...e){if(Kn.logLevel<=J.WARN){const t=e.map(Mu);Kn.warn(`Firestore (${Xr}): ${n}`,...t)}}function Mu(n){if(typeof n=="string")return n;try{return(function(t){return JSON.stringify(t)})(n)}catch{return n}}/**
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
 */function M(n,e,t){let r="Unexpected state";typeof e=="string"?r=e:t=e,Im(n,r,t)}function Im(n,e,t){let r=`FIRESTORE (${Xr}) INTERNAL ASSERTION FAILED: ${e} (ID: ${n.toString(16)})`;if(t!==void 0)try{r+=" CONTEXT: "+JSON.stringify(t)}catch{r+=" CONTEXT: "+t}throw me(r),new Error(r)}function F(n,e,t,r){let i="Unexpected state";typeof t=="string"?i=t:r=t,n||Im(e,i,r)}function L(n,e){return n}/**
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
 */const P={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class N extends rt{constructor(e,t){super(e,t),this.code=e,this.message=t,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
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
 */class lt{constructor(){this.promise=new Promise(((e,t)=>{this.resolve=e,this.reject=t}))}}/**
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
 */class qE{constructor(e,t){this.user=t,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}}class jE{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,t){e.enqueueRetryable((()=>t(De.UNAUTHENTICATED)))}shutdown(){}}class zE{constructor(e){this.t=e,this.currentUser=De.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(e,t){F(this.o===void 0,42304);let r=this.i;const i=u=>this.i!==r?(r=this.i,t(u)):Promise.resolve();let s=new lt;this.o=()=>{this.i++,this.currentUser=this.u(),s.resolve(),s=new lt,e.enqueueRetryable((()=>i(this.currentUser)))};const o=()=>{const u=s;e.enqueueRetryable((async()=>{await u.promise,await i(this.currentUser)}))},c=u=>{k("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=u,this.o&&(this.auth.addAuthTokenListener(this.o),o())};this.t.onInit((u=>c(u))),setTimeout((()=>{if(!this.auth){const u=this.t.getImmediate({optional:!0});u?c(u):(k("FirebaseAuthCredentialsProvider","Auth not yet detected"),s.resolve(),s=new lt)}}),0),o()}getToken(){const e=this.i,t=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(t).then((r=>this.i!==e?(k("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):r?(F(typeof r.accessToken=="string",31837,{l:r}),new qE(r.accessToken,this.currentUser)):null)):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const e=this.auth&&this.auth.getUid();return F(e===null||typeof e=="string",2055,{h:e}),new De(e)}}class GE{constructor(e,t,r){this.P=e,this.T=t,this.I=r,this.type="FirstParty",this.user=De.FIRST_PARTY,this.R=new Map}A(){return this.I?this.I():null}get headers(){this.R.set("X-Goog-AuthUser",this.P);const e=this.A();return e&&this.R.set("Authorization",e),this.T&&this.R.set("X-Goog-Iam-Authorization-Token",this.T),this.R}}class KE{constructor(e,t,r){this.P=e,this.T=t,this.I=r}getToken(){return Promise.resolve(new GE(this.P,this.T,this.I))}start(e,t){e.enqueueRetryable((()=>t(De.FIRST_PARTY)))}shutdown(){}invalidateToken(){}}class kd{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class HE{constructor(e,t){this.V=t,this.forceRefresh=!1,this.appCheck=null,this.m=null,this.p=null,qe(e)&&e.settings.appCheckToken&&(this.p=e.settings.appCheckToken)}start(e,t){F(this.o===void 0,3512);const r=s=>{s.error!=null&&k("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${s.error.message}`);const o=s.token!==this.m;return this.m=s.token,k("FirebaseAppCheckTokenProvider",`Received ${o?"new":"existing"} token.`),o?t(s.token):Promise.resolve()};this.o=s=>{e.enqueueRetryable((()=>r(s)))};const i=s=>{k("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=s,this.o&&this.appCheck.addTokenListener(this.o)};this.V.onInit((s=>i(s))),setTimeout((()=>{if(!this.appCheck){const s=this.V.getImmediate({optional:!0});s?i(s):k("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}}),0)}getToken(){if(this.p)return Promise.resolve(new kd(this.p));const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then((t=>t?(F(typeof t.token=="string",44558,{tokenResult:t}),this.m=t.token,new kd(t.token)):null)):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}/**
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
 */function WE(n){const e=typeof self<"u"&&(self.crypto||self.msCrypto),t=new Uint8Array(n);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(t);else for(let r=0;r<n;r++)t[r]=Math.floor(256*Math.random());return t}/**
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
 */class Lu{static newId(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",t=62*Math.floor(4.129032258064516);let r="";for(;r.length<20;){const i=WE(40);for(let s=0;s<i.length;++s)r.length<20&&i[s]<t&&(r+=e.charAt(i[s]%62))}return r}}function z(n,e){return n<e?-1:n>e?1:0}function Kc(n,e){const t=Math.min(n.length,e.length);for(let r=0;r<t;r++){const i=n.charAt(r),s=e.charAt(r);if(i!==s)return _c(i)===_c(s)?z(i,s):_c(i)?1:-1}return z(n.length,e.length)}const QE=55296,JE=57343;function _c(n){const e=n.charCodeAt(0);return e>=QE&&e<=JE}function Nr(n,e,t){return n.length===e.length&&n.every(((r,i)=>t(r,e[i])))}function Tm(n){return n+"\0"}/**
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
 */const Dd="__name__";class gt{constructor(e,t,r){t===void 0?t=0:t>e.length&&M(637,{offset:t,range:e.length}),r===void 0?r=e.length-t:r>e.length-t&&M(1746,{length:r,range:e.length-t}),this.segments=e,this.offset=t,this.len=r}get length(){return this.len}isEqual(e){return gt.comparator(this,e)===0}child(e){const t=this.segments.slice(this.offset,this.limit());return e instanceof gt?e.forEach((r=>{t.push(r)})):t.push(e),this.construct(t)}limit(){return this.offset+this.length}popFirst(e){return e=e===void 0?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return this.length===0}isPrefixOf(e){if(e.length<this.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}forEach(e){for(let t=this.offset,r=this.limit();t<r;t++)e(this.segments[t])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,t){const r=Math.min(e.length,t.length);for(let i=0;i<r;i++){const s=gt.compareSegments(e.get(i),t.get(i));if(s!==0)return s}return z(e.length,t.length)}static compareSegments(e,t){const r=gt.isNumericId(e),i=gt.isNumericId(t);return r&&!i?-1:!r&&i?1:r&&i?gt.extractNumericId(e).compare(gt.extractNumericId(t)):Kc(e,t)}static isNumericId(e){return e.startsWith("__id")&&e.endsWith("__")}static extractNumericId(e){return an.fromString(e.substring(4,e.length-2))}}class ee extends gt{construct(e,t,r){return new ee(e,t,r)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){const t=[];for(const r of e){if(r.indexOf("//")>=0)throw new N(P.INVALID_ARGUMENT,`Invalid segment (${r}). Paths must not contain // in them.`);t.push(...r.split("/").filter((i=>i.length>0)))}return new ee(t)}static emptyPath(){return new ee([])}}const YE=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class le extends gt{construct(e,t,r){return new le(e,t,r)}static isValidIdentifier(e){return YE.test(e)}canonicalString(){return this.toArray().map((e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),le.isValidIdentifier(e)||(e="`"+e+"`"),e))).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)===Dd}static keyField(){return new le([Dd])}static fromServerFormat(e){const t=[];let r="",i=0;const s=()=>{if(r.length===0)throw new N(P.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);t.push(r),r=""};let o=!1;for(;i<e.length;){const c=e[i];if(c==="\\"){if(i+1===e.length)throw new N(P.INVALID_ARGUMENT,"Path has trailing escape character: "+e);const u=e[i+1];if(u!=="\\"&&u!=="."&&u!=="`")throw new N(P.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);r+=u,i+=2}else c==="`"?(o=!o,i++):c!=="."||o?(r+=c,i++):(s(),i++)}if(s(),o)throw new N(P.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new le(t)}static emptyPath(){return new le([])}}/**
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
 */class x{constructor(e){this.path=e}static fromPath(e){return new x(ee.fromString(e))}static fromName(e){return new x(ee.fromString(e).popFirst(5))}static empty(){return new x(ee.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(e){return this.path.length>=2&&this.path.get(this.path.length-2)===e}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(e){return e!==null&&ee.comparator(this.path,e.path)===0}toString(){return this.path.toString()}static comparator(e,t){return ee.comparator(e.path,t.path)}static isDocumentKey(e){return e.length%2==0}static fromSegments(e){return new x(new ee(e.slice()))}}/**
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
 */function Em(n,e,t){if(!t)throw new N(P.INVALID_ARGUMENT,`Function ${n}() cannot be called with an empty ${e}.`)}function XE(n,e,t,r){if(e===!0&&r===!0)throw new N(P.INVALID_ARGUMENT,`${n} and ${t} cannot be used together.`)}function Nd(n){if(!x.isDocumentKey(n))throw new N(P.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${n} has ${n.length}.`)}function Vd(n){if(x.isDocumentKey(n))throw new N(P.INVALID_ARGUMENT,`Invalid collection reference. Collection references must have an odd number of segments, but ${n} has ${n.length}.`)}function wm(n){return typeof n=="object"&&n!==null&&(Object.getPrototypeOf(n)===Object.prototype||Object.getPrototypeOf(n)===null)}function ha(n){if(n===void 0)return"undefined";if(n===null)return"null";if(typeof n=="string")return n.length>20&&(n=`${n.substring(0,20)}...`),JSON.stringify(n);if(typeof n=="number"||typeof n=="boolean")return""+n;if(typeof n=="object"){if(n instanceof Array)return"an array";{const e=(function(r){return r.constructor?r.constructor.name:null})(n);return e?`a custom ${e} object`:"an object"}}return typeof n=="function"?"a function":M(12329,{type:typeof n})}function Be(n,e){if("_delegate"in n&&(n=n._delegate),!(n instanceof e)){if(e.name===n.constructor.name)throw new N(P.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const t=ha(n);throw new N(P.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${t}`)}}return n}/**
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
 */function ye(n,e){const t={typeString:n};return e&&(t.value=e),t}function Es(n,e){if(!wm(n))throw new N(P.INVALID_ARGUMENT,"JSON must be an object");let t;for(const r in e)if(e[r]){const i=e[r].typeString,s="value"in e[r]?{value:e[r].value}:void 0;if(!(r in n)){t=`JSON missing required field: '${r}'`;break}const o=n[r];if(i&&typeof o!==i){t=`JSON field '${r}' must be a ${i}.`;break}if(s!==void 0&&o!==s.value){t=`Expected '${r}' field to equal '${s.value}'`;break}}if(t)throw new N(P.INVALID_ARGUMENT,t);return!0}/**
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
 */const Od=-62135596800,xd=1e6;class te{static now(){return te.fromMillis(Date.now())}static fromDate(e){return te.fromMillis(e.getTime())}static fromMillis(e){const t=Math.floor(e/1e3),r=Math.floor((e-1e3*t)*xd);return new te(t,r)}constructor(e,t){if(this.seconds=e,this.nanoseconds=t,t<0)throw new N(P.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(t>=1e9)throw new N(P.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(e<Od)throw new N(P.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new N(P.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/xd}_compareTo(e){return this.seconds===e.seconds?z(this.nanoseconds,e.nanoseconds):z(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{type:te._jsonSchemaVersion,seconds:this.seconds,nanoseconds:this.nanoseconds}}static fromJSON(e){if(Es(e,te._jsonSchema))return new te(e.seconds,e.nanoseconds)}valueOf(){const e=this.seconds-Od;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}te._jsonSchemaVersion="firestore/timestamp/1.0",te._jsonSchema={type:ye("string",te._jsonSchemaVersion),seconds:ye("number"),nanoseconds:ye("number")};/**
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
 */class B{static fromTimestamp(e){return new B(e)}static min(){return new B(new te(0,0))}static max(){return new B(new te(253402300799,999999999))}constructor(e){this.timestamp=e}compareTo(e){return this.timestamp._compareTo(e.timestamp)}isEqual(e){return this.timestamp.isEqual(e.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}/**
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
 */const Vr=-1;class Vo{constructor(e,t,r,i){this.indexId=e,this.collectionGroup=t,this.fields=r,this.indexState=i}}function Hc(n){return n.fields.find((e=>e.kind===2))}function Vn(n){return n.fields.filter((e=>e.kind!==2))}Vo.UNKNOWN_ID=-1;class po{constructor(e,t){this.fieldPath=e,this.kind=t}}class es{constructor(e,t){this.sequenceNumber=e,this.offset=t}static empty(){return new es(0,nt.min())}}function vm(n,e){const t=n.toTimestamp().seconds,r=n.toTimestamp().nanoseconds+1,i=B.fromTimestamp(r===1e9?new te(t+1,0):new te(t,r));return new nt(i,x.empty(),e)}function Am(n){return new nt(n.readTime,n.key,Vr)}class nt{constructor(e,t,r){this.readTime=e,this.documentKey=t,this.largestBatchId=r}static min(){return new nt(B.min(),x.empty(),Vr)}static max(){return new nt(B.max(),x.empty(),Vr)}}function Fu(n,e){let t=n.readTime.compareTo(e.readTime);return t!==0?t:(t=x.comparator(n.documentKey,e.documentKey),t!==0?t:z(n.largestBatchId,e.largestBatchId))}/**
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
 */const bm="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class Rm{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(e){this.onCommittedListeners.push(e)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach((e=>e()))}}/**
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
 */async function In(n){if(n.code!==P.FAILED_PRECONDITION||n.message!==bm)throw n;k("LocalStore","Unexpectedly lost primary lease")}/**
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
 */class v{constructor(e){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,e((t=>{this.isDone=!0,this.result=t,this.nextCallback&&this.nextCallback(t)}),(t=>{this.isDone=!0,this.error=t,this.catchCallback&&this.catchCallback(t)}))}catch(e){return this.next(void 0,e)}next(e,t){return this.callbackAttached&&M(59440),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(t,this.error):this.wrapSuccess(e,this.result):new v(((r,i)=>{this.nextCallback=s=>{this.wrapSuccess(e,s).next(r,i)},this.catchCallback=s=>{this.wrapFailure(t,s).next(r,i)}}))}toPromise(){return new Promise(((e,t)=>{this.next(e,t)}))}wrapUserFunction(e){try{const t=e();return t instanceof v?t:v.resolve(t)}catch(t){return v.reject(t)}}wrapSuccess(e,t){return e?this.wrapUserFunction((()=>e(t))):v.resolve(t)}wrapFailure(e,t){return e?this.wrapUserFunction((()=>e(t))):v.reject(t)}static resolve(e){return new v(((t,r)=>{t(e)}))}static reject(e){return new v(((t,r)=>{r(e)}))}static waitFor(e){return new v(((t,r)=>{let i=0,s=0,o=!1;e.forEach((c=>{++i,c.next((()=>{++s,o&&s===i&&t()}),(u=>r(u)))})),o=!0,s===i&&t()}))}static or(e){let t=v.resolve(!1);for(const r of e)t=t.next((i=>i?v.resolve(i):r()));return t}static forEach(e,t){const r=[];return e.forEach(((i,s)=>{r.push(t.call(this,i,s))})),this.waitFor(r)}static mapArray(e,t){return new v(((r,i)=>{const s=e.length,o=new Array(s);let c=0;for(let u=0;u<s;u++){const l=u;t(e[l]).next((f=>{o[l]=f,++c,c===s&&r(o)}),(f=>i(f)))}}))}static doWhile(e,t){return new v(((r,i)=>{const s=()=>{e()===!0?t().next((()=>{s()}),i):r()};s()}))}}/**
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
 */const Qe="SimpleDb";class da{static open(e,t,r,i){try{return new da(t,e.transaction(i,r))}catch(s){throw new Ui(t,s)}}constructor(e,t){this.action=e,this.transaction=t,this.aborted=!1,this.S=new lt,this.transaction.oncomplete=()=>{this.S.resolve()},this.transaction.onabort=()=>{t.error?this.S.reject(new Ui(e,t.error)):this.S.resolve()},this.transaction.onerror=r=>{const i=Uu(r.target.error);this.S.reject(new Ui(e,i))}}get D(){return this.S.promise}abort(e){e&&this.S.reject(e),this.aborted||(k(Qe,"Aborting transaction:",e?e.message:"Client-initiated abort"),this.aborted=!0,this.transaction.abort())}C(){const e=this.transaction;this.aborted||typeof e.commit!="function"||e.commit()}store(e){const t=this.transaction.objectStore(e);return new ew(t)}}class cn{static delete(e){return k(Qe,"Removing database:",e),xn(em().indexedDB.deleteDatabase(e)).toPromise()}static v(){if(!_s())return!1;if(cn.F())return!0;const e=Ee(),t=cn.M(e),r=0<t&&t<10,i=Sm(e),s=0<i&&i<4.5;return!(e.indexOf("MSIE ")>0||e.indexOf("Trident/")>0||e.indexOf("Edge/")>0||r||s)}static F(){return typeof process<"u"&&process.__PRIVATE_env?.__PRIVATE_USE_MOCK_PERSISTENCE==="YES"}static O(e,t){return e.store(t)}static M(e){const t=e.match(/i(?:phone|pad|pod) os ([\d_]+)/i),r=t?t[1].split("_").slice(0,2).join("."):"-1";return Number(r)}constructor(e,t,r){this.name=e,this.version=t,this.N=r,this.B=null,cn.M(Ee())===12.2&&me("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.")}async L(e){return this.db||(k(Qe,"Opening database:",this.name),this.db=await new Promise(((t,r)=>{const i=indexedDB.open(this.name,this.version);i.onsuccess=s=>{const o=s.target.result;t(o)},i.onblocked=()=>{r(new Ui(e,"Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."))},i.onerror=s=>{const o=s.target.error;o.name==="VersionError"?r(new N(P.FAILED_PRECONDITION,"A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")):o.name==="InvalidStateError"?r(new N(P.FAILED_PRECONDITION,"Unable to open an IndexedDB connection. This could be due to running in a private browsing session on a browser whose private browsing sessions do not support IndexedDB: "+o)):r(new Ui(e,o))},i.onupgradeneeded=s=>{k(Qe,'Database "'+this.name+'" requires upgrade from version:',s.oldVersion);const o=s.target.result;this.N.k(o,i.transaction,s.oldVersion,this.version).next((()=>{k(Qe,"Database upgrade to version "+this.version+" complete")}))}}))),this.K&&(this.db.onversionchange=t=>this.K(t)),this.db}q(e){this.K=e,this.db&&(this.db.onversionchange=t=>e(t))}async runTransaction(e,t,r,i){const s=t==="readonly";let o=0;for(;;){++o;try{this.db=await this.L(e);const c=da.open(this.db,e,s?"readonly":"readwrite",r),u=i(c).next((l=>(c.C(),l))).catch((l=>(c.abort(l),v.reject(l)))).toPromise();return u.catch((()=>{})),await c.D,u}catch(c){const u=c,l=u.name!=="FirebaseError"&&o<3;if(k(Qe,"Transaction failed with error:",u.message,"Retrying:",l),this.close(),!l)return Promise.reject(u)}}}close(){this.db&&this.db.close(),this.db=void 0}}function Sm(n){const e=n.match(/Android ([\d.]+)/i),t=e?e[1].split(".").slice(0,2).join("."):"-1";return Number(t)}class ZE{constructor(e){this.U=e,this.$=!1,this.W=null}get isDone(){return this.$}get G(){return this.W}set cursor(e){this.U=e}done(){this.$=!0}j(e){this.W=e}delete(){return xn(this.U.delete())}}class Ui extends N{constructor(e,t){super(P.UNAVAILABLE,`IndexedDB transaction '${e}' failed: ${t}`),this.name="IndexedDbTransactionError"}}function Tn(n){return n.name==="IndexedDbTransactionError"}class ew{constructor(e){this.store=e}put(e,t){let r;return t!==void 0?(k(Qe,"PUT",this.store.name,e,t),r=this.store.put(t,e)):(k(Qe,"PUT",this.store.name,"<auto-key>",e),r=this.store.put(e)),xn(r)}add(e){return k(Qe,"ADD",this.store.name,e,e),xn(this.store.add(e))}get(e){return xn(this.store.get(e)).next((t=>(t===void 0&&(t=null),k(Qe,"GET",this.store.name,e,t),t)))}delete(e){return k(Qe,"DELETE",this.store.name,e),xn(this.store.delete(e))}count(){return k(Qe,"COUNT",this.store.name),xn(this.store.count())}H(e,t){const r=this.options(e,t),i=r.index?this.store.index(r.index):this.store;if(typeof i.getAll=="function"){const s=i.getAll(r.range);return new v(((o,c)=>{s.onerror=u=>{c(u.target.error)},s.onsuccess=u=>{o(u.target.result)}}))}{const s=this.cursor(r),o=[];return this.J(s,((c,u)=>{o.push(u)})).next((()=>o))}}Z(e,t){const r=this.store.getAll(e,t===null?void 0:t);return new v(((i,s)=>{r.onerror=o=>{s(o.target.error)},r.onsuccess=o=>{i(o.target.result)}}))}X(e,t){k(Qe,"DELETE ALL",this.store.name);const r=this.options(e,t);r.Y=!1;const i=this.cursor(r);return this.J(i,((s,o,c)=>c.delete()))}ee(e,t){let r;t?r=e:(r={},t=e);const i=this.cursor(r);return this.J(i,t)}te(e){const t=this.cursor({});return new v(((r,i)=>{t.onerror=s=>{const o=Uu(s.target.error);i(o)},t.onsuccess=s=>{const o=s.target.result;o?e(o.primaryKey,o.value).next((c=>{c?o.continue():r()})):r()}}))}J(e,t){const r=[];return new v(((i,s)=>{e.onerror=o=>{s(o.target.error)},e.onsuccess=o=>{const c=o.target.result;if(!c)return void i();const u=new ZE(c),l=t(c.primaryKey,c.value,u);if(l instanceof v){const f=l.catch((p=>(u.done(),v.reject(p))));r.push(f)}u.isDone?i():u.G===null?c.continue():c.continue(u.G)}})).next((()=>v.waitFor(r)))}options(e,t){let r;return e!==void 0&&(typeof e=="string"?r=e:t=e),{index:r,range:t}}cursor(e){let t="next";if(e.reverse&&(t="prev"),e.index){const r=this.store.index(e.index);return e.Y?r.openKeyCursor(e.range,t):r.openCursor(e.range,t)}return this.store.openCursor(e.range,t)}}function xn(n){return new v(((e,t)=>{n.onsuccess=r=>{const i=r.target.result;e(i)},n.onerror=r=>{const i=Uu(r.target.error);t(i)}}))}let Md=!1;function Uu(n){const e=cn.M(Ee());if(e>=12.2&&e<13){const t="An internal error was encountered in the Indexed Database server";if(n.message.indexOf(t)>=0){const r=new N("internal",`IOS_INDEXEDDB_BUG1: IndexedDb has thrown '${t}'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.`);return Md||(Md=!0,setTimeout((()=>{throw r}),0)),r}}return n}const Bi="IndexBackfiller";class tw{constructor(e,t){this.asyncQueue=e,this.ne=t,this.task=null}start(){this.re(15e3)}stop(){this.task&&(this.task.cancel(),this.task=null)}get started(){return this.task!==null}re(e){k(Bi,`Scheduled in ${e}ms`),this.task=this.asyncQueue.enqueueAfterDelay("index_backfill",e,(async()=>{this.task=null;try{const t=await this.ne.ie();k(Bi,`Documents written: ${t}`)}catch(t){Tn(t)?k(Bi,"Ignoring IndexedDB error during index backfill: ",t):await In(t)}await this.re(6e4)}))}}class nw{constructor(e,t){this.localStore=e,this.persistence=t}async ie(e=50){return this.persistence.runTransaction("Backfill Indexes","readwrite-primary",(t=>this.se(t,e)))}se(e,t){const r=new Set;let i=t,s=!0;return v.doWhile((()=>s===!0&&i>0),(()=>this.localStore.indexManager.getNextCollectionGroupToUpdate(e).next((o=>{if(o!==null&&!r.has(o))return k(Bi,`Processing collection: ${o}`),this.oe(e,o,i).next((c=>{i-=c,r.add(o)}));s=!1})))).next((()=>t-i))}oe(e,t,r){return this.localStore.indexManager.getMinOffsetFromCollectionGroup(e,t).next((i=>this.localStore.localDocuments.getNextDocuments(e,t,i,r).next((s=>{const o=s.changes;return this.localStore.indexManager.updateIndexEntries(e,o).next((()=>this._e(i,s))).next((c=>(k(Bi,`Updating offset: ${c}`),this.localStore.indexManager.updateCollectionGroup(e,t,c)))).next((()=>o.size))}))))}_e(e,t){let r=e;return t.changes.forEach(((i,s)=>{const o=Am(s);Fu(o,r)>0&&(r=o)})),new nt(r.readTime,r.documentKey,Math.max(t.batchId,e.largestBatchId))}}/**
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
 */class je{constructor(e,t){this.previousValue=e,t&&(t.sequenceNumberHandler=r=>this.ae(r),this.ue=r=>t.writeSequenceNumber(r))}ae(e){return this.previousValue=Math.max(e,this.previousValue),this.previousValue}next(){const e=++this.previousValue;return this.ue&&this.ue(e),e}}je.ce=-1;/**
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
 */const $n=-1;function ws(n){return n==null}function ts(n){return n===0&&1/n==-1/0}function Pm(n){return typeof n=="number"&&Number.isInteger(n)&&!ts(n)&&n<=Number.MAX_SAFE_INTEGER&&n>=Number.MIN_SAFE_INTEGER}/**
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
 */const Oo="";function Oe(n){let e="";for(let t=0;t<n.length;t++)e.length>0&&(e=Ld(e)),e=rw(n.get(t),e);return Ld(e)}function rw(n,e){let t=e;const r=n.length;for(let i=0;i<r;i++){const s=n.charAt(i);switch(s){case"\0":t+="";break;case Oo:t+="";break;default:t+=s}}return t}function Ld(n){return n+Oo+""}function yt(n){const e=n.length;if(F(e>=2,64408,{path:n}),e===2)return F(n.charAt(0)===Oo&&n.charAt(1)==="",56145,{path:n}),ee.emptyPath();const t=e-2,r=[];let i="";for(let s=0;s<e;){const o=n.indexOf(Oo,s);switch((o<0||o>t)&&M(50515,{path:n}),n.charAt(o+1)){case"":const c=n.substring(s,o);let u;i.length===0?u=c:(i+=c,u=i,i=""),r.push(u);break;case"":i+=n.substring(s,o),i+="\0";break;case"":i+=n.substring(s,o+1);break;default:M(61167,{path:n})}s=o+2}return new ee(r)}/**
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
 */const On="remoteDocuments",vs="owner",lr="owner",ns="mutationQueues",iw="userId",at="mutations",Fd="batchId",Un="userMutationsIndex",Ud=["userId","batchId"];/**
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
 */function mo(n,e){return[n,Oe(e)]}function Cm(n,e,t){return[n,Oe(e),t]}const sw={},Or="documentMutations",xo="remoteDocumentsV14",ow=["prefixPath","collectionGroup","readTime","documentId"],go="documentKeyIndex",aw=["prefixPath","collectionGroup","documentId"],km="collectionGroupIndex",cw=["collectionGroup","readTime","prefixPath","documentId"],rs="remoteDocumentGlobal",Wc="remoteDocumentGlobalKey",xr="targets",Dm="queryTargetsIndex",uw=["canonicalId","targetId"],Mr="targetDocuments",lw=["targetId","path"],Bu="documentTargetsIndex",hw=["path","targetId"],Mo="targetGlobalKey",qn="targetGlobal",is="collectionParents",dw=["collectionId","parent"],Lr="clientMetadata",fw="clientId",fa="bundles",pw="bundleId",pa="namedQueries",mw="name",$u="indexConfiguration",gw="indexId",Qc="collectionGroupIndex",_w="collectionGroup",$i="indexState",yw=["indexId","uid"],Nm="sequenceNumberIndex",Iw=["uid","sequenceNumber"],qi="indexEntries",Tw=["indexId","uid","arrayValue","directionalValue","orderedDocumentKey","documentKey"],Vm="documentKeyIndex",Ew=["indexId","uid","orderedDocumentKey"],ma="documentOverlays",ww=["userId","collectionPath","documentId"],Jc="collectionPathOverlayIndex",vw=["userId","collectionPath","largestBatchId"],Om="collectionGroupOverlayIndex",Aw=["userId","collectionGroup","largestBatchId"],qu="globals",bw="name",xm=[ns,at,Or,On,xr,vs,qn,Mr,Lr,rs,is,fa,pa],Rw=[...xm,ma],Mm=[ns,at,Or,xo,xr,vs,qn,Mr,Lr,rs,is,fa,pa,ma],Lm=Mm,ju=[...Lm,$u,$i,qi],Sw=ju,Fm=[...ju,qu],Pw=Fm;/**
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
 */class Yc extends Rm{constructor(e,t){super(),this.le=e,this.currentSequenceNumber=t}}function we(n,e){const t=L(n);return cn.O(t.le,e)}/**
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
 */function Bd(n){let e=0;for(const t in n)Object.prototype.hasOwnProperty.call(n,t)&&e++;return e}function En(n,e){for(const t in n)Object.prototype.hasOwnProperty.call(n,t)&&e(t,n[t])}function Um(n){for(const e in n)if(Object.prototype.hasOwnProperty.call(n,e))return!1;return!0}/**
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
 */class se{constructor(e,t){this.comparator=e,this.root=t||Se.EMPTY}insert(e,t){return new se(this.comparator,this.root.insert(e,t,this.comparator).copy(null,null,Se.BLACK,null,null))}remove(e){return new se(this.comparator,this.root.remove(e,this.comparator).copy(null,null,Se.BLACK,null,null))}get(e){let t=this.root;for(;!t.isEmpty();){const r=this.comparator(e,t.key);if(r===0)return t.value;r<0?t=t.left:r>0&&(t=t.right)}return null}indexOf(e){let t=0,r=this.root;for(;!r.isEmpty();){const i=this.comparator(e,r.key);if(i===0)return t+r.left.size;i<0?r=r.left:(t+=r.left.size+1,r=r.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(e){return this.root.inorderTraversal(e)}forEach(e){this.inorderTraversal(((t,r)=>(e(t,r),!1)))}toString(){const e=[];return this.inorderTraversal(((t,r)=>(e.push(`${t}:${r}`),!1))),`{${e.join(", ")}}`}reverseTraversal(e){return this.root.reverseTraversal(e)}getIterator(){return new to(this.root,null,this.comparator,!1)}getIteratorFrom(e){return new to(this.root,e,this.comparator,!1)}getReverseIterator(){return new to(this.root,null,this.comparator,!0)}getReverseIteratorFrom(e){return new to(this.root,e,this.comparator,!0)}}class to{constructor(e,t,r,i){this.isReverse=i,this.nodeStack=[];let s=1;for(;!e.isEmpty();)if(s=t?r(e.key,t):1,t&&i&&(s*=-1),s<0)e=this.isReverse?e.left:e.right;else{if(s===0){this.nodeStack.push(e);break}this.nodeStack.push(e),e=this.isReverse?e.right:e.left}}getNext(){let e=this.nodeStack.pop();const t={key:e.key,value:e.value};if(this.isReverse)for(e=e.left;!e.isEmpty();)this.nodeStack.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack.push(e),e=e.left;return t}hasNext(){return this.nodeStack.length>0}peek(){if(this.nodeStack.length===0)return null;const e=this.nodeStack[this.nodeStack.length-1];return{key:e.key,value:e.value}}}class Se{constructor(e,t,r,i,s){this.key=e,this.value=t,this.color=r??Se.RED,this.left=i??Se.EMPTY,this.right=s??Se.EMPTY,this.size=this.left.size+1+this.right.size}copy(e,t,r,i,s){return new Se(e??this.key,t??this.value,r??this.color,i??this.left,s??this.right)}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,t,r){let i=this;const s=r(e,i.key);return i=s<0?i.copy(null,null,null,i.left.insert(e,t,r),null):s===0?i.copy(null,t,null,null,null):i.copy(null,null,null,null,i.right.insert(e,t,r)),i.fixUp()}removeMin(){if(this.left.isEmpty())return Se.EMPTY;let e=this;return e.left.isRed()||e.left.left.isRed()||(e=e.moveRedLeft()),e=e.copy(null,null,null,e.left.removeMin(),null),e.fixUp()}remove(e,t){let r,i=this;if(t(e,i.key)<0)i.left.isEmpty()||i.left.isRed()||i.left.left.isRed()||(i=i.moveRedLeft()),i=i.copy(null,null,null,i.left.remove(e,t),null);else{if(i.left.isRed()&&(i=i.rotateRight()),i.right.isEmpty()||i.right.isRed()||i.right.left.isRed()||(i=i.moveRedRight()),t(e,i.key)===0){if(i.right.isEmpty())return Se.EMPTY;r=i.right.min(),i=i.copy(r.key,r.value,null,null,i.right.removeMin())}i=i.copy(null,null,null,null,i.right.remove(e,t))}return i.fixUp()}isRed(){return this.color}fixUp(){let e=this;return e.right.isRed()&&!e.left.isRed()&&(e=e.rotateLeft()),e.left.isRed()&&e.left.left.isRed()&&(e=e.rotateRight()),e.left.isRed()&&e.right.isRed()&&(e=e.colorFlip()),e}moveRedLeft(){let e=this.colorFlip();return e.right.left.isRed()&&(e=e.copy(null,null,null,null,e.right.rotateRight()),e=e.rotateLeft(),e=e.colorFlip()),e}moveRedRight(){let e=this.colorFlip();return e.left.left.isRed()&&(e=e.rotateRight(),e=e.colorFlip()),e}rotateLeft(){const e=this.copy(null,null,Se.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight(){const e=this.copy(null,null,Se.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip(){const e=this.left.copy(null,null,!this.left.color,null,null),t=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,t)}checkMaxDepth(){const e=this.check();return Math.pow(2,e)<=this.size+1}check(){if(this.isRed()&&this.left.isRed())throw M(43730,{key:this.key,value:this.value});if(this.right.isRed())throw M(14113,{key:this.key,value:this.value});const e=this.left.check();if(e!==this.right.check())throw M(27949);return e+(this.isRed()?0:1)}}Se.EMPTY=null,Se.RED=!0,Se.BLACK=!1;Se.EMPTY=new class{constructor(){this.size=0}get key(){throw M(57766)}get value(){throw M(16141)}get color(){throw M(16727)}get left(){throw M(29726)}get right(){throw M(36894)}copy(e,t,r,i,s){return this}insert(e,t,r){return new Se(e,t)}remove(e,t){return this}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};/**
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
 */class re{constructor(e){this.comparator=e,this.data=new se(this.comparator)}has(e){return this.data.get(e)!==null}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(e){return this.data.indexOf(e)}forEach(e){this.data.inorderTraversal(((t,r)=>(e(t),!1)))}forEachInRange(e,t){const r=this.data.getIteratorFrom(e[0]);for(;r.hasNext();){const i=r.getNext();if(this.comparator(i.key,e[1])>=0)return;t(i.key)}}forEachWhile(e,t){let r;for(r=t!==void 0?this.data.getIteratorFrom(t):this.data.getIterator();r.hasNext();)if(!e(r.getNext().key))return}firstAfterOrEqual(e){const t=this.data.getIteratorFrom(e);return t.hasNext()?t.getNext().key:null}getIterator(){return new $d(this.data.getIterator())}getIteratorFrom(e){return new $d(this.data.getIteratorFrom(e))}add(e){return this.copy(this.data.remove(e).insert(e,!0))}delete(e){return this.has(e)?this.copy(this.data.remove(e)):this}isEmpty(){return this.data.isEmpty()}unionWith(e){let t=this;return t.size<e.size&&(t=e,e=this),e.forEach((r=>{t=t.add(r)})),t}isEqual(e){if(!(e instanceof re)||this.size!==e.size)return!1;const t=this.data.getIterator(),r=e.data.getIterator();for(;t.hasNext();){const i=t.getNext().key,s=r.getNext().key;if(this.comparator(i,s)!==0)return!1}return!0}toArray(){const e=[];return this.forEach((t=>{e.push(t)})),e}toString(){const e=[];return this.forEach((t=>e.push(t))),"SortedSet("+e.toString()+")"}copy(e){const t=new re(this.comparator);return t.data=e,t}}class $d{constructor(e){this.iter=e}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}function hr(n){return n.hasNext()?n.getNext():void 0}/**
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
 */class ze{constructor(e){this.fields=e,e.sort(le.comparator)}static empty(){return new ze([])}unionWith(e){let t=new re(le.comparator);for(const r of this.fields)t=t.add(r);for(const r of e)t=t.add(r);return new ze(t.toArray())}covers(e){for(const t of this.fields)if(t.isPrefixOf(e))return!0;return!1}isEqual(e){return Nr(this.fields,e.fields,((t,r)=>t.isEqual(r)))}}/**
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
 */class Bm extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
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
 */class ge{constructor(e){this.binaryString=e}static fromBase64String(e){const t=(function(i){try{return atob(i)}catch(s){throw typeof DOMException<"u"&&s instanceof DOMException?new Bm("Invalid base64 string: "+s):s}})(e);return new ge(t)}static fromUint8Array(e){const t=(function(i){let s="";for(let o=0;o<i.length;++o)s+=String.fromCharCode(i[o]);return s})(e);return new ge(t)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return(function(t){return btoa(t)})(this.binaryString)}toUint8Array(){return(function(t){const r=new Uint8Array(t.length);for(let i=0;i<t.length;i++)r[i]=t.charCodeAt(i);return r})(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return z(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}}ge.EMPTY_BYTE_STRING=new ge("");const Cw=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function Vt(n){if(F(!!n,39018),typeof n=="string"){let e=0;const t=Cw.exec(n);if(F(!!t,46558,{timestamp:n}),t[1]){let i=t[1];i=(i+"000000000").substr(0,9),e=Number(i)}const r=new Date(n);return{seconds:Math.floor(r.getTime()/1e3),nanos:e}}return{seconds:ae(n.seconds),nanos:ae(n.nanos)}}function ae(n){return typeof n=="number"?n:typeof n=="string"?Number(n):0}function Ot(n){return typeof n=="string"?ge.fromBase64String(n):ge.fromUint8Array(n)}/**
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
 */const $m="server_timestamp",qm="__type__",jm="__previous_value__",zm="__local_write_time__";function zu(n){return(n?.mapValue?.fields||{})[qm]?.stringValue===$m}function ga(n){const e=n.mapValue.fields[jm];return zu(e)?ga(e):e}function ss(n){const e=Vt(n.mapValue.fields[zm].timestampValue);return new te(e.seconds,e.nanos)}/**
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
 */class kw{constructor(e,t,r,i,s,o,c,u,l,f,p){this.databaseId=e,this.appId=t,this.persistenceKey=r,this.host=i,this.ssl=s,this.forceLongPolling=o,this.autoDetectLongPolling=c,this.longPollingOptions=u,this.useFetchStreams=l,this.isUsingEmulator=f,this.apiKey=p}}const Lo="(default)";class Hn{constructor(e,t){this.projectId=e,this.database=t||Lo}static empty(){return new Hn("","")}get isDefaultDatabase(){return this.database===Lo}isEqual(e){return e instanceof Hn&&e.projectId===this.projectId&&e.database===this.database}}function Dw(n,e){if(!Object.prototype.hasOwnProperty.apply(n.options,["projectId"]))throw new N(P.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new Hn(n.options.projectId,e)}/**
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
 */const Gu="__type__",Gm="__max__",nn={mapValue:{fields:{__type__:{stringValue:Gm}}}},Ku="__vector__",Fr="value",_o={nullValue:"NULL_VALUE"};function dn(n){return"nullValue"in n?0:"booleanValue"in n?1:"integerValue"in n||"doubleValue"in n?2:"timestampValue"in n?3:"stringValue"in n?5:"bytesValue"in n?6:"referenceValue"in n?7:"geoPointValue"in n?8:"arrayValue"in n?9:"mapValue"in n?zu(n)?4:Km(n)?9007199254740991:_a(n)?10:11:M(28295,{value:n})}function At(n,e){if(n===e)return!0;const t=dn(n);if(t!==dn(e))return!1;switch(t){case 0:case 9007199254740991:return!0;case 1:return n.booleanValue===e.booleanValue;case 4:return ss(n).isEqual(ss(e));case 3:return(function(i,s){if(typeof i.timestampValue=="string"&&typeof s.timestampValue=="string"&&i.timestampValue.length===s.timestampValue.length)return i.timestampValue===s.timestampValue;const o=Vt(i.timestampValue),c=Vt(s.timestampValue);return o.seconds===c.seconds&&o.nanos===c.nanos})(n,e);case 5:return n.stringValue===e.stringValue;case 6:return(function(i,s){return Ot(i.bytesValue).isEqual(Ot(s.bytesValue))})(n,e);case 7:return n.referenceValue===e.referenceValue;case 8:return(function(i,s){return ae(i.geoPointValue.latitude)===ae(s.geoPointValue.latitude)&&ae(i.geoPointValue.longitude)===ae(s.geoPointValue.longitude)})(n,e);case 2:return(function(i,s){if("integerValue"in i&&"integerValue"in s)return ae(i.integerValue)===ae(s.integerValue);if("doubleValue"in i&&"doubleValue"in s){const o=ae(i.doubleValue),c=ae(s.doubleValue);return o===c?ts(o)===ts(c):isNaN(o)&&isNaN(c)}return!1})(n,e);case 9:return Nr(n.arrayValue.values||[],e.arrayValue.values||[],At);case 10:case 11:return(function(i,s){const o=i.mapValue.fields||{},c=s.mapValue.fields||{};if(Bd(o)!==Bd(c))return!1;for(const u in o)if(o.hasOwnProperty(u)&&(c[u]===void 0||!At(o[u],c[u])))return!1;return!0})(n,e);default:return M(52216,{left:n})}}function os(n,e){return(n.values||[]).find((t=>At(t,e)))!==void 0}function fn(n,e){if(n===e)return 0;const t=dn(n),r=dn(e);if(t!==r)return z(t,r);switch(t){case 0:case 9007199254740991:return 0;case 1:return z(n.booleanValue,e.booleanValue);case 2:return(function(s,o){const c=ae(s.integerValue||s.doubleValue),u=ae(o.integerValue||o.doubleValue);return c<u?-1:c>u?1:c===u?0:isNaN(c)?isNaN(u)?0:-1:1})(n,e);case 3:return qd(n.timestampValue,e.timestampValue);case 4:return qd(ss(n),ss(e));case 5:return Kc(n.stringValue,e.stringValue);case 6:return(function(s,o){const c=Ot(s),u=Ot(o);return c.compareTo(u)})(n.bytesValue,e.bytesValue);case 7:return(function(s,o){const c=s.split("/"),u=o.split("/");for(let l=0;l<c.length&&l<u.length;l++){const f=z(c[l],u[l]);if(f!==0)return f}return z(c.length,u.length)})(n.referenceValue,e.referenceValue);case 8:return(function(s,o){const c=z(ae(s.latitude),ae(o.latitude));return c!==0?c:z(ae(s.longitude),ae(o.longitude))})(n.geoPointValue,e.geoPointValue);case 9:return jd(n.arrayValue,e.arrayValue);case 10:return(function(s,o){const c=s.fields||{},u=o.fields||{},l=c[Fr]?.arrayValue,f=u[Fr]?.arrayValue,p=z(l?.values?.length||0,f?.values?.length||0);return p!==0?p:jd(l,f)})(n.mapValue,e.mapValue);case 11:return(function(s,o){if(s===nn.mapValue&&o===nn.mapValue)return 0;if(s===nn.mapValue)return 1;if(o===nn.mapValue)return-1;const c=s.fields||{},u=Object.keys(c),l=o.fields||{},f=Object.keys(l);u.sort(),f.sort();for(let p=0;p<u.length&&p<f.length;++p){const g=Kc(u[p],f[p]);if(g!==0)return g;const A=fn(c[u[p]],l[f[p]]);if(A!==0)return A}return z(u.length,f.length)})(n.mapValue,e.mapValue);default:throw M(23264,{he:t})}}function qd(n,e){if(typeof n=="string"&&typeof e=="string"&&n.length===e.length)return z(n,e);const t=Vt(n),r=Vt(e),i=z(t.seconds,r.seconds);return i!==0?i:z(t.nanos,r.nanos)}function jd(n,e){const t=n.values||[],r=e.values||[];for(let i=0;i<t.length&&i<r.length;++i){const s=fn(t[i],r[i]);if(s)return s}return z(t.length,r.length)}function Ur(n){return Xc(n)}function Xc(n){return"nullValue"in n?"null":"booleanValue"in n?""+n.booleanValue:"integerValue"in n?""+n.integerValue:"doubleValue"in n?""+n.doubleValue:"timestampValue"in n?(function(t){const r=Vt(t);return`time(${r.seconds},${r.nanos})`})(n.timestampValue):"stringValue"in n?n.stringValue:"bytesValue"in n?(function(t){return Ot(t).toBase64()})(n.bytesValue):"referenceValue"in n?(function(t){return x.fromName(t).toString()})(n.referenceValue):"geoPointValue"in n?(function(t){return`geo(${t.latitude},${t.longitude})`})(n.geoPointValue):"arrayValue"in n?(function(t){let r="[",i=!0;for(const s of t.values||[])i?i=!1:r+=",",r+=Xc(s);return r+"]"})(n.arrayValue):"mapValue"in n?(function(t){const r=Object.keys(t.fields||{}).sort();let i="{",s=!0;for(const o of r)s?s=!1:i+=",",i+=`${o}:${Xc(t.fields[o])}`;return i+"}"})(n.mapValue):M(61005,{value:n})}function yo(n){switch(dn(n)){case 0:case 1:return 4;case 2:return 8;case 3:case 8:return 16;case 4:const e=ga(n);return e?16+yo(e):16;case 5:return 2*n.stringValue.length;case 6:return Ot(n.bytesValue).approximateByteSize();case 7:return n.referenceValue.length;case 9:return(function(r){return(r.values||[]).reduce(((i,s)=>i+yo(s)),0)})(n.arrayValue);case 10:case 11:return(function(r){let i=0;return En(r.fields,((s,o)=>{i+=s.length+yo(o)})),i})(n.mapValue);default:throw M(13486,{value:n})}}function as(n,e){return{referenceValue:`projects/${n.projectId}/databases/${n.database}/documents/${e.path.canonicalString()}`}}function Zc(n){return!!n&&"integerValue"in n}function cs(n){return!!n&&"arrayValue"in n}function zd(n){return!!n&&"nullValue"in n}function Gd(n){return!!n&&"doubleValue"in n&&isNaN(Number(n.doubleValue))}function Io(n){return!!n&&"mapValue"in n}function _a(n){return(n?.mapValue?.fields||{})[Gu]?.stringValue===Ku}function ji(n){if(n.geoPointValue)return{geoPointValue:{...n.geoPointValue}};if(n.timestampValue&&typeof n.timestampValue=="object")return{timestampValue:{...n.timestampValue}};if(n.mapValue){const e={mapValue:{fields:{}}};return En(n.mapValue.fields,((t,r)=>e.mapValue.fields[t]=ji(r))),e}if(n.arrayValue){const e={arrayValue:{values:[]}};for(let t=0;t<(n.arrayValue.values||[]).length;++t)e.arrayValue.values[t]=ji(n.arrayValue.values[t]);return e}return{...n}}function Km(n){return(((n.mapValue||{}).fields||{}).__type__||{}).stringValue===Gm}const Hm={mapValue:{fields:{[Gu]:{stringValue:Ku},[Fr]:{arrayValue:{}}}}};function Nw(n){return"nullValue"in n?_o:"booleanValue"in n?{booleanValue:!1}:"integerValue"in n||"doubleValue"in n?{doubleValue:NaN}:"timestampValue"in n?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"stringValue"in n?{stringValue:""}:"bytesValue"in n?{bytesValue:""}:"referenceValue"in n?as(Hn.empty(),x.empty()):"geoPointValue"in n?{geoPointValue:{latitude:-90,longitude:-180}}:"arrayValue"in n?{arrayValue:{}}:"mapValue"in n?_a(n)?Hm:{mapValue:{}}:M(35942,{value:n})}function Vw(n){return"nullValue"in n?{booleanValue:!1}:"booleanValue"in n?{doubleValue:NaN}:"integerValue"in n||"doubleValue"in n?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"timestampValue"in n?{stringValue:""}:"stringValue"in n?{bytesValue:""}:"bytesValue"in n?as(Hn.empty(),x.empty()):"referenceValue"in n?{geoPointValue:{latitude:-90,longitude:-180}}:"geoPointValue"in n?{arrayValue:{}}:"arrayValue"in n?Hm:"mapValue"in n?_a(n)?{mapValue:{}}:nn:M(61959,{value:n})}function Kd(n,e){const t=fn(n.value,e.value);return t!==0?t:n.inclusive&&!e.inclusive?-1:!n.inclusive&&e.inclusive?1:0}function Hd(n,e){const t=fn(n.value,e.value);return t!==0?t:n.inclusive&&!e.inclusive?1:!n.inclusive&&e.inclusive?-1:0}/**
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
 */class Pe{constructor(e){this.value=e}static empty(){return new Pe({mapValue:{}})}field(e){if(e.isEmpty())return this.value;{let t=this.value;for(let r=0;r<e.length-1;++r)if(t=(t.mapValue.fields||{})[e.get(r)],!Io(t))return null;return t=(t.mapValue.fields||{})[e.lastSegment()],t||null}}set(e,t){this.getFieldsMap(e.popLast())[e.lastSegment()]=ji(t)}setAll(e){let t=le.emptyPath(),r={},i=[];e.forEach(((o,c)=>{if(!t.isImmediateParentOf(c)){const u=this.getFieldsMap(t);this.applyChanges(u,r,i),r={},i=[],t=c.popLast()}o?r[c.lastSegment()]=ji(o):i.push(c.lastSegment())}));const s=this.getFieldsMap(t);this.applyChanges(s,r,i)}delete(e){const t=this.field(e.popLast());Io(t)&&t.mapValue.fields&&delete t.mapValue.fields[e.lastSegment()]}isEqual(e){return At(this.value,e.value)}getFieldsMap(e){let t=this.value;t.mapValue.fields||(t.mapValue={fields:{}});for(let r=0;r<e.length;++r){let i=t.mapValue.fields[e.get(r)];Io(i)&&i.mapValue.fields||(i={mapValue:{fields:{}}},t.mapValue.fields[e.get(r)]=i),t=i}return t.mapValue.fields}applyChanges(e,t,r){En(t,((i,s)=>e[i]=s));for(const i of r)delete e[i]}clone(){return new Pe(ji(this.value))}}function Wm(n){const e=[];return En(n.fields,((t,r)=>{const i=new le([t]);if(Io(r)){const s=Wm(r.mapValue).fields;if(s.length===0)e.push(i);else for(const o of s)e.push(i.child(o))}else e.push(i)})),new ze(e)}/**
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
 */class ce{constructor(e,t,r,i,s,o,c){this.key=e,this.documentType=t,this.version=r,this.readTime=i,this.createTime=s,this.data=o,this.documentState=c}static newInvalidDocument(e){return new ce(e,0,B.min(),B.min(),B.min(),Pe.empty(),0)}static newFoundDocument(e,t,r,i){return new ce(e,1,t,B.min(),r,i,0)}static newNoDocument(e,t){return new ce(e,2,t,B.min(),B.min(),Pe.empty(),0)}static newUnknownDocument(e,t){return new ce(e,3,t,B.min(),B.min(),Pe.empty(),2)}convertToFoundDocument(e,t){return!this.createTime.isEqual(B.min())||this.documentType!==2&&this.documentType!==0||(this.createTime=e),this.version=e,this.documentType=1,this.data=t,this.documentState=0,this}convertToNoDocument(e){return this.version=e,this.documentType=2,this.data=Pe.empty(),this.documentState=0,this}convertToUnknownDocument(e){return this.version=e,this.documentType=3,this.data=Pe.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=B.min(),this}setReadTime(e){return this.readTime=e,this}get hasLocalMutations(){return this.documentState===1}get hasCommittedMutations(){return this.documentState===2}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return this.documentType!==0}isFoundDocument(){return this.documentType===1}isNoDocument(){return this.documentType===2}isUnknownDocument(){return this.documentType===3}isEqual(e){return e instanceof ce&&this.key.isEqual(e.key)&&this.version.isEqual(e.version)&&this.documentType===e.documentType&&this.documentState===e.documentState&&this.data.isEqual(e.data)}mutableCopy(){return new ce(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}/**
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
 */class Br{constructor(e,t){this.position=e,this.inclusive=t}}function Wd(n,e,t){let r=0;for(let i=0;i<n.position.length;i++){const s=e[i],o=n.position[i];if(s.field.isKeyField()?r=x.comparator(x.fromName(o.referenceValue),t.key):r=fn(o,t.data.field(s.field)),s.dir==="desc"&&(r*=-1),r!==0)break}return r}function Qd(n,e){if(n===null)return e===null;if(e===null||n.inclusive!==e.inclusive||n.position.length!==e.position.length)return!1;for(let t=0;t<n.position.length;t++)if(!At(n.position[t],e.position[t]))return!1;return!0}/**
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
 */class us{constructor(e,t="asc"){this.field=e,this.dir=t}}function Ow(n,e){return n.dir===e.dir&&n.field.isEqual(e.field)}/**
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
 */class Qm{}class Y extends Qm{constructor(e,t,r){super(),this.field=e,this.op=t,this.value=r}static create(e,t,r){return e.isKeyField()?t==="in"||t==="not-in"?this.createKeyFieldInFilter(e,t,r):new xw(e,t,r):t==="array-contains"?new Fw(e,r):t==="in"?new tg(e,r):t==="not-in"?new Uw(e,r):t==="array-contains-any"?new Bw(e,r):new Y(e,t,r)}static createKeyFieldInFilter(e,t,r){return t==="in"?new Mw(e,r):new Lw(e,r)}matches(e){const t=e.data.field(this.field);return this.op==="!="?t!==null&&t.nullValue===void 0&&this.matchesComparison(fn(t,this.value)):t!==null&&dn(this.value)===dn(t)&&this.matchesComparison(fn(t,this.value))}matchesComparison(e){switch(this.op){case"<":return e<0;case"<=":return e<=0;case"==":return e===0;case"!=":return e!==0;case">":return e>0;case">=":return e>=0;default:return M(47266,{operator:this.op})}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class ne extends Qm{constructor(e,t){super(),this.filters=e,this.op=t,this.Pe=null}static create(e,t){return new ne(e,t)}matches(e){return $r(this)?this.filters.find((t=>!t.matches(e)))===void 0:this.filters.find((t=>t.matches(e)))!==void 0}getFlattenedFilters(){return this.Pe!==null||(this.Pe=this.filters.reduce(((e,t)=>e.concat(t.getFlattenedFilters())),[])),this.Pe}getFilters(){return Object.assign([],this.filters)}}function $r(n){return n.op==="and"}function eu(n){return n.op==="or"}function Hu(n){return Jm(n)&&$r(n)}function Jm(n){for(const e of n.filters)if(e instanceof ne)return!1;return!0}function tu(n){if(n instanceof Y)return n.field.canonicalString()+n.op.toString()+Ur(n.value);if(Hu(n))return n.filters.map((e=>tu(e))).join(",");{const e=n.filters.map((t=>tu(t))).join(",");return`${n.op}(${e})`}}function Ym(n,e){return n instanceof Y?(function(r,i){return i instanceof Y&&r.op===i.op&&r.field.isEqual(i.field)&&At(r.value,i.value)})(n,e):n instanceof ne?(function(r,i){return i instanceof ne&&r.op===i.op&&r.filters.length===i.filters.length?r.filters.reduce(((s,o,c)=>s&&Ym(o,i.filters[c])),!0):!1})(n,e):void M(19439)}function Xm(n,e){const t=n.filters.concat(e);return ne.create(t,n.op)}function Zm(n){return n instanceof Y?(function(t){return`${t.field.canonicalString()} ${t.op} ${Ur(t.value)}`})(n):n instanceof ne?(function(t){return t.op.toString()+" {"+t.getFilters().map(Zm).join(" ,")+"}"})(n):"Filter"}class xw extends Y{constructor(e,t,r){super(e,t,r),this.key=x.fromName(r.referenceValue)}matches(e){const t=x.comparator(e.key,this.key);return this.matchesComparison(t)}}class Mw extends Y{constructor(e,t){super(e,"in",t),this.keys=eg("in",t)}matches(e){return this.keys.some((t=>t.isEqual(e.key)))}}class Lw extends Y{constructor(e,t){super(e,"not-in",t),this.keys=eg("not-in",t)}matches(e){return!this.keys.some((t=>t.isEqual(e.key)))}}function eg(n,e){return(e.arrayValue?.values||[]).map((t=>x.fromName(t.referenceValue)))}class Fw extends Y{constructor(e,t){super(e,"array-contains",t)}matches(e){const t=e.data.field(this.field);return cs(t)&&os(t.arrayValue,this.value)}}class tg extends Y{constructor(e,t){super(e,"in",t)}matches(e){const t=e.data.field(this.field);return t!==null&&os(this.value.arrayValue,t)}}class Uw extends Y{constructor(e,t){super(e,"not-in",t)}matches(e){if(os(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const t=e.data.field(this.field);return t!==null&&t.nullValue===void 0&&!os(this.value.arrayValue,t)}}class Bw extends Y{constructor(e,t){super(e,"array-contains-any",t)}matches(e){const t=e.data.field(this.field);return!(!cs(t)||!t.arrayValue.values)&&t.arrayValue.values.some((r=>os(this.value.arrayValue,r)))}}/**
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
 */class $w{constructor(e,t=null,r=[],i=[],s=null,o=null,c=null){this.path=e,this.collectionGroup=t,this.orderBy=r,this.filters=i,this.limit=s,this.startAt=o,this.endAt=c,this.Te=null}}function nu(n,e=null,t=[],r=[],i=null,s=null,o=null){return new $w(n,e,t,r,i,s,o)}function Wn(n){const e=L(n);if(e.Te===null){let t=e.path.canonicalString();e.collectionGroup!==null&&(t+="|cg:"+e.collectionGroup),t+="|f:",t+=e.filters.map((r=>tu(r))).join(","),t+="|ob:",t+=e.orderBy.map((r=>(function(s){return s.field.canonicalString()+s.dir})(r))).join(","),ws(e.limit)||(t+="|l:",t+=e.limit),e.startAt&&(t+="|lb:",t+=e.startAt.inclusive?"b:":"a:",t+=e.startAt.position.map((r=>Ur(r))).join(",")),e.endAt&&(t+="|ub:",t+=e.endAt.inclusive?"a:":"b:",t+=e.endAt.position.map((r=>Ur(r))).join(",")),e.Te=t}return e.Te}function As(n,e){if(n.limit!==e.limit||n.orderBy.length!==e.orderBy.length)return!1;for(let t=0;t<n.orderBy.length;t++)if(!Ow(n.orderBy[t],e.orderBy[t]))return!1;if(n.filters.length!==e.filters.length)return!1;for(let t=0;t<n.filters.length;t++)if(!Ym(n.filters[t],e.filters[t]))return!1;return n.collectionGroup===e.collectionGroup&&!!n.path.isEqual(e.path)&&!!Qd(n.startAt,e.startAt)&&Qd(n.endAt,e.endAt)}function Fo(n){return x.isDocumentKey(n.path)&&n.collectionGroup===null&&n.filters.length===0}function Uo(n,e){return n.filters.filter((t=>t instanceof Y&&t.field.isEqual(e)))}function Jd(n,e,t){let r=_o,i=!0;for(const s of Uo(n,e)){let o=_o,c=!0;switch(s.op){case"<":case"<=":o=Nw(s.value);break;case"==":case"in":case">=":o=s.value;break;case">":o=s.value,c=!1;break;case"!=":case"not-in":o=_o}Kd({value:r,inclusive:i},{value:o,inclusive:c})<0&&(r=o,i=c)}if(t!==null){for(let s=0;s<n.orderBy.length;++s)if(n.orderBy[s].field.isEqual(e)){const o=t.position[s];Kd({value:r,inclusive:i},{value:o,inclusive:t.inclusive})<0&&(r=o,i=t.inclusive);break}}return{value:r,inclusive:i}}function Yd(n,e,t){let r=nn,i=!0;for(const s of Uo(n,e)){let o=nn,c=!0;switch(s.op){case">=":case">":o=Vw(s.value),c=!1;break;case"==":case"in":case"<=":o=s.value;break;case"<":o=s.value,c=!1;break;case"!=":case"not-in":o=nn}Hd({value:r,inclusive:i},{value:o,inclusive:c})>0&&(r=o,i=c)}if(t!==null){for(let s=0;s<n.orderBy.length;++s)if(n.orderBy[s].field.isEqual(e)){const o=t.position[s];Hd({value:r,inclusive:i},{value:o,inclusive:t.inclusive})>0&&(r=o,i=t.inclusive);break}}return{value:r,inclusive:i}}/**
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
 */class Zr{constructor(e,t=null,r=[],i=[],s=null,o="F",c=null,u=null){this.path=e,this.collectionGroup=t,this.explicitOrderBy=r,this.filters=i,this.limit=s,this.limitType=o,this.startAt=c,this.endAt=u,this.Ie=null,this.Ee=null,this.Re=null,this.startAt,this.endAt}}function ng(n,e,t,r,i,s,o,c){return new Zr(n,e,t,r,i,s,o,c)}function bs(n){return new Zr(n)}function Xd(n){return n.filters.length===0&&n.limit===null&&n.startAt==null&&n.endAt==null&&(n.explicitOrderBy.length===0||n.explicitOrderBy.length===1&&n.explicitOrderBy[0].field.isKeyField())}function qw(n){return x.isDocumentKey(n.path)&&n.collectionGroup===null&&n.filters.length===0}function rg(n){return n.collectionGroup!==null}function zi(n){const e=L(n);if(e.Ie===null){e.Ie=[];const t=new Set;for(const s of e.explicitOrderBy)e.Ie.push(s),t.add(s.field.canonicalString());const r=e.explicitOrderBy.length>0?e.explicitOrderBy[e.explicitOrderBy.length-1].dir:"asc";(function(o){let c=new re(le.comparator);return o.filters.forEach((u=>{u.getFlattenedFilters().forEach((l=>{l.isInequality()&&(c=c.add(l.field))}))})),c})(e).forEach((s=>{t.has(s.canonicalString())||s.isKeyField()||e.Ie.push(new us(s,r))})),t.has(le.keyField().canonicalString())||e.Ie.push(new us(le.keyField(),r))}return e.Ie}function Ze(n){const e=L(n);return e.Ee||(e.Ee=jw(e,zi(n))),e.Ee}function jw(n,e){if(n.limitType==="F")return nu(n.path,n.collectionGroup,e,n.filters,n.limit,n.startAt,n.endAt);{e=e.map((i=>{const s=i.dir==="desc"?"asc":"desc";return new us(i.field,s)}));const t=n.endAt?new Br(n.endAt.position,n.endAt.inclusive):null,r=n.startAt?new Br(n.startAt.position,n.startAt.inclusive):null;return nu(n.path,n.collectionGroup,e,n.filters,n.limit,t,r)}}function ru(n,e){const t=n.filters.concat([e]);return new Zr(n.path,n.collectionGroup,n.explicitOrderBy.slice(),t,n.limit,n.limitType,n.startAt,n.endAt)}function zw(n,e){const t=n.explicitOrderBy.concat([e]);return new Zr(n.path,n.collectionGroup,t,n.filters.slice(),n.limit,n.limitType,n.startAt,n.endAt)}function iu(n,e,t){return new Zr(n.path,n.collectionGroup,n.explicitOrderBy.slice(),n.filters.slice(),e,t,n.startAt,n.endAt)}function ya(n,e){return As(Ze(n),Ze(e))&&n.limitType===e.limitType}function ig(n){return`${Wn(Ze(n))}|lt:${n.limitType}`}function _r(n){return`Query(target=${(function(t){let r=t.path.canonicalString();return t.collectionGroup!==null&&(r+=" collectionGroup="+t.collectionGroup),t.filters.length>0&&(r+=`, filters: [${t.filters.map((i=>Zm(i))).join(", ")}]`),ws(t.limit)||(r+=", limit: "+t.limit),t.orderBy.length>0&&(r+=`, orderBy: [${t.orderBy.map((i=>(function(o){return`${o.field.canonicalString()} (${o.dir})`})(i))).join(", ")}]`),t.startAt&&(r+=", startAt: ",r+=t.startAt.inclusive?"b:":"a:",r+=t.startAt.position.map((i=>Ur(i))).join(",")),t.endAt&&(r+=", endAt: ",r+=t.endAt.inclusive?"a:":"b:",r+=t.endAt.position.map((i=>Ur(i))).join(",")),`Target(${r})`})(Ze(n))}; limitType=${n.limitType})`}function Rs(n,e){return e.isFoundDocument()&&(function(r,i){const s=i.key.path;return r.collectionGroup!==null?i.key.hasCollectionId(r.collectionGroup)&&r.path.isPrefixOf(s):x.isDocumentKey(r.path)?r.path.isEqual(s):r.path.isImmediateParentOf(s)})(n,e)&&(function(r,i){for(const s of zi(r))if(!s.field.isKeyField()&&i.data.field(s.field)===null)return!1;return!0})(n,e)&&(function(r,i){for(const s of r.filters)if(!s.matches(i))return!1;return!0})(n,e)&&(function(r,i){return!(r.startAt&&!(function(o,c,u){const l=Wd(o,c,u);return o.inclusive?l<=0:l<0})(r.startAt,zi(r),i)||r.endAt&&!(function(o,c,u){const l=Wd(o,c,u);return o.inclusive?l>=0:l>0})(r.endAt,zi(r),i))})(n,e)}function sg(n){return n.collectionGroup||(n.path.length%2==1?n.path.lastSegment():n.path.get(n.path.length-2))}function og(n){return(e,t)=>{let r=!1;for(const i of zi(n)){const s=Gw(i,e,t);if(s!==0)return s;r=r||i.field.isKeyField()}return 0}}function Gw(n,e,t){const r=n.field.isKeyField()?x.comparator(e.key,t.key):(function(s,o,c){const u=o.data.field(s),l=c.data.field(s);return u!==null&&l!==null?fn(u,l):M(42886)})(n.field,e,t);switch(n.dir){case"asc":return r;case"desc":return-1*r;default:return M(19790,{direction:n.dir})}}/**
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
 */class Lt{constructor(e,t){this.mapKeyFn=e,this.equalsFn=t,this.inner={},this.innerSize=0}get(e){const t=this.mapKeyFn(e),r=this.inner[t];if(r!==void 0){for(const[i,s]of r)if(this.equalsFn(i,e))return s}}has(e){return this.get(e)!==void 0}set(e,t){const r=this.mapKeyFn(e),i=this.inner[r];if(i===void 0)return this.inner[r]=[[e,t]],void this.innerSize++;for(let s=0;s<i.length;s++)if(this.equalsFn(i[s][0],e))return void(i[s]=[e,t]);i.push([e,t]),this.innerSize++}delete(e){const t=this.mapKeyFn(e),r=this.inner[t];if(r===void 0)return!1;for(let i=0;i<r.length;i++)if(this.equalsFn(r[i][0],e))return r.length===1?delete this.inner[t]:r.splice(i,1),this.innerSize--,!0;return!1}forEach(e){En(this.inner,((t,r)=>{for(const[i,s]of r)e(i,s)}))}isEmpty(){return Um(this.inner)}size(){return this.innerSize}}/**
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
 */const Kw=new se(x.comparator);function Ye(){return Kw}const ag=new se(x.comparator);function xi(...n){let e=ag;for(const t of n)e=e.insert(t.key,t);return e}function cg(n){let e=ag;return n.forEach(((t,r)=>e=e.insert(t,r.overlayedDocument))),e}function It(){return Gi()}function ug(){return Gi()}function Gi(){return new Lt((n=>n.toString()),((n,e)=>n.isEqual(e)))}const Hw=new se(x.comparator),Ww=new re(x.comparator);function W(...n){let e=Ww;for(const t of n)e=e.add(t);return e}const Qw=new re(z);function Wu(){return Qw}/**
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
 */function Qu(n,e){if(n.useProto3Json){if(isNaN(e))return{doubleValue:"NaN"};if(e===1/0)return{doubleValue:"Infinity"};if(e===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:ts(e)?"-0":e}}function lg(n){return{integerValue:""+n}}function hg(n,e){return Pm(e)?lg(e):Qu(n,e)}/**
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
 */class Ia{constructor(){this._=void 0}}function Jw(n,e,t){return n instanceof ls?(function(i,s){const o={fields:{[qm]:{stringValue:$m},[zm]:{timestampValue:{seconds:i.seconds,nanos:i.nanoseconds}}}};return s&&zu(s)&&(s=ga(s)),s&&(o.fields[jm]=s),{mapValue:o}})(t,e):n instanceof qr?fg(n,e):n instanceof jr?pg(n,e):(function(i,s){const o=dg(i,s),c=Zd(o)+Zd(i.Ae);return Zc(o)&&Zc(i.Ae)?lg(c):Qu(i.serializer,c)})(n,e)}function Yw(n,e,t){return n instanceof qr?fg(n,e):n instanceof jr?pg(n,e):t}function dg(n,e){return n instanceof zr?(function(r){return Zc(r)||(function(s){return!!s&&"doubleValue"in s})(r)})(e)?e:{integerValue:0}:null}class ls extends Ia{}class qr extends Ia{constructor(e){super(),this.elements=e}}function fg(n,e){const t=mg(e);for(const r of n.elements)t.some((i=>At(i,r)))||t.push(r);return{arrayValue:{values:t}}}class jr extends Ia{constructor(e){super(),this.elements=e}}function pg(n,e){let t=mg(e);for(const r of n.elements)t=t.filter((i=>!At(i,r)));return{arrayValue:{values:t}}}class zr extends Ia{constructor(e,t){super(),this.serializer=e,this.Ae=t}}function Zd(n){return ae(n.integerValue||n.doubleValue)}function mg(n){return cs(n)&&n.arrayValue.values?n.arrayValue.values.slice():[]}/**
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
 */class gg{constructor(e,t){this.field=e,this.transform=t}}function Xw(n,e){return n.field.isEqual(e.field)&&(function(r,i){return r instanceof qr&&i instanceof qr||r instanceof jr&&i instanceof jr?Nr(r.elements,i.elements,At):r instanceof zr&&i instanceof zr?At(r.Ae,i.Ae):r instanceof ls&&i instanceof ls})(n.transform,e.transform)}class Zw{constructor(e,t){this.version=e,this.transformResults=t}}class ue{constructor(e,t){this.updateTime=e,this.exists=t}static none(){return new ue}static exists(e){return new ue(void 0,e)}static updateTime(e){return new ue(e)}get isNone(){return this.updateTime===void 0&&this.exists===void 0}isEqual(e){return this.exists===e.exists&&(this.updateTime?!!e.updateTime&&this.updateTime.isEqual(e.updateTime):!e.updateTime)}}function To(n,e){return n.updateTime!==void 0?e.isFoundDocument()&&e.version.isEqual(n.updateTime):n.exists===void 0||n.exists===e.isFoundDocument()}class Ta{}function _g(n,e){if(!n.hasLocalMutations||e&&e.fields.length===0)return null;if(e===null)return n.isNoDocument()?new ti(n.key,ue.none()):new ei(n.key,n.data,ue.none());{const t=n.data,r=Pe.empty();let i=new re(le.comparator);for(let s of e.fields)if(!i.has(s)){let o=t.field(s);o===null&&s.length>1&&(s=s.popLast(),o=t.field(s)),o===null?r.delete(s):r.set(s,o),i=i.add(s)}return new Ft(n.key,r,new ze(i.toArray()),ue.none())}}function ev(n,e,t){n instanceof ei?(function(i,s,o){const c=i.value.clone(),u=tf(i.fieldTransforms,s,o.transformResults);c.setAll(u),s.convertToFoundDocument(o.version,c).setHasCommittedMutations()})(n,e,t):n instanceof Ft?(function(i,s,o){if(!To(i.precondition,s))return void s.convertToUnknownDocument(o.version);const c=tf(i.fieldTransforms,s,o.transformResults),u=s.data;u.setAll(yg(i)),u.setAll(c),s.convertToFoundDocument(o.version,u).setHasCommittedMutations()})(n,e,t):(function(i,s,o){s.convertToNoDocument(o.version).setHasCommittedMutations()})(0,e,t)}function Ki(n,e,t,r){return n instanceof ei?(function(s,o,c,u){if(!To(s.precondition,o))return c;const l=s.value.clone(),f=nf(s.fieldTransforms,u,o);return l.setAll(f),o.convertToFoundDocument(o.version,l).setHasLocalMutations(),null})(n,e,t,r):n instanceof Ft?(function(s,o,c,u){if(!To(s.precondition,o))return c;const l=nf(s.fieldTransforms,u,o),f=o.data;return f.setAll(yg(s)),f.setAll(l),o.convertToFoundDocument(o.version,f).setHasLocalMutations(),c===null?null:c.unionWith(s.fieldMask.fields).unionWith(s.fieldTransforms.map((p=>p.field)))})(n,e,t,r):(function(s,o,c){return To(s.precondition,o)?(o.convertToNoDocument(o.version).setHasLocalMutations(),null):c})(n,e,t)}function tv(n,e){let t=null;for(const r of n.fieldTransforms){const i=e.data.field(r.field),s=dg(r.transform,i||null);s!=null&&(t===null&&(t=Pe.empty()),t.set(r.field,s))}return t||null}function ef(n,e){return n.type===e.type&&!!n.key.isEqual(e.key)&&!!n.precondition.isEqual(e.precondition)&&!!(function(r,i){return r===void 0&&i===void 0||!(!r||!i)&&Nr(r,i,((s,o)=>Xw(s,o)))})(n.fieldTransforms,e.fieldTransforms)&&(n.type===0?n.value.isEqual(e.value):n.type!==1||n.data.isEqual(e.data)&&n.fieldMask.isEqual(e.fieldMask))}class ei extends Ta{constructor(e,t,r,i=[]){super(),this.key=e,this.value=t,this.precondition=r,this.fieldTransforms=i,this.type=0}getFieldMask(){return null}}class Ft extends Ta{constructor(e,t,r,i,s=[]){super(),this.key=e,this.data=t,this.fieldMask=r,this.precondition=i,this.fieldTransforms=s,this.type=1}getFieldMask(){return this.fieldMask}}function yg(n){const e=new Map;return n.fieldMask.fields.forEach((t=>{if(!t.isEmpty()){const r=n.data.field(t);e.set(t,r)}})),e}function tf(n,e,t){const r=new Map;F(n.length===t.length,32656,{Ve:t.length,de:n.length});for(let i=0;i<t.length;i++){const s=n[i],o=s.transform,c=e.data.field(s.field);r.set(s.field,Yw(o,c,t[i]))}return r}function nf(n,e,t){const r=new Map;for(const i of n){const s=i.transform,o=t.data.field(i.field);r.set(i.field,Jw(s,o,e))}return r}class ti extends Ta{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class Ju extends Ta{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}/**
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
 */class Yu{constructor(e,t,r,i){this.batchId=e,this.localWriteTime=t,this.baseMutations=r,this.mutations=i}applyToRemoteDocument(e,t){const r=t.mutationResults;for(let i=0;i<this.mutations.length;i++){const s=this.mutations[i];s.key.isEqual(e.key)&&ev(s,e,r[i])}}applyToLocalView(e,t){for(const r of this.baseMutations)r.key.isEqual(e.key)&&(t=Ki(r,e,t,this.localWriteTime));for(const r of this.mutations)r.key.isEqual(e.key)&&(t=Ki(r,e,t,this.localWriteTime));return t}applyToLocalDocumentSet(e,t){const r=ug();return this.mutations.forEach((i=>{const s=e.get(i.key),o=s.overlayedDocument;let c=this.applyToLocalView(o,s.mutatedFields);c=t.has(i.key)?null:c;const u=_g(o,c);u!==null&&r.set(i.key,u),o.isValidDocument()||o.convertToNoDocument(B.min())})),r}keys(){return this.mutations.reduce(((e,t)=>e.add(t.key)),W())}isEqual(e){return this.batchId===e.batchId&&Nr(this.mutations,e.mutations,((t,r)=>ef(t,r)))&&Nr(this.baseMutations,e.baseMutations,((t,r)=>ef(t,r)))}}class Xu{constructor(e,t,r,i){this.batch=e,this.commitVersion=t,this.mutationResults=r,this.docVersions=i}static from(e,t,r){F(e.mutations.length===r.length,58842,{me:e.mutations.length,fe:r.length});let i=(function(){return Hw})();const s=e.mutations;for(let o=0;o<s.length;o++)i=i.insert(s[o].key,r[o].version);return new Xu(e,t,r,i)}}/**
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
 */class Zu{constructor(e,t){this.largestBatchId=e,this.mutation=t}getKey(){return this.mutation.key}isEqual(e){return e!==null&&this.mutation===e.mutation}toString(){return`Overlay{
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
 */class nv{constructor(e,t){this.count=e,this.unchangedNames=t}}/**
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
 */var _e,X;function Ig(n){switch(n){case P.OK:return M(64938);case P.CANCELLED:case P.UNKNOWN:case P.DEADLINE_EXCEEDED:case P.RESOURCE_EXHAUSTED:case P.INTERNAL:case P.UNAVAILABLE:case P.UNAUTHENTICATED:return!1;case P.INVALID_ARGUMENT:case P.NOT_FOUND:case P.ALREADY_EXISTS:case P.PERMISSION_DENIED:case P.FAILED_PRECONDITION:case P.ABORTED:case P.OUT_OF_RANGE:case P.UNIMPLEMENTED:case P.DATA_LOSS:return!0;default:return M(15467,{code:n})}}function Tg(n){if(n===void 0)return me("GRPC error has no .code"),P.UNKNOWN;switch(n){case _e.OK:return P.OK;case _e.CANCELLED:return P.CANCELLED;case _e.UNKNOWN:return P.UNKNOWN;case _e.DEADLINE_EXCEEDED:return P.DEADLINE_EXCEEDED;case _e.RESOURCE_EXHAUSTED:return P.RESOURCE_EXHAUSTED;case _e.INTERNAL:return P.INTERNAL;case _e.UNAVAILABLE:return P.UNAVAILABLE;case _e.UNAUTHENTICATED:return P.UNAUTHENTICATED;case _e.INVALID_ARGUMENT:return P.INVALID_ARGUMENT;case _e.NOT_FOUND:return P.NOT_FOUND;case _e.ALREADY_EXISTS:return P.ALREADY_EXISTS;case _e.PERMISSION_DENIED:return P.PERMISSION_DENIED;case _e.FAILED_PRECONDITION:return P.FAILED_PRECONDITION;case _e.ABORTED:return P.ABORTED;case _e.OUT_OF_RANGE:return P.OUT_OF_RANGE;case _e.UNIMPLEMENTED:return P.UNIMPLEMENTED;case _e.DATA_LOSS:return P.DATA_LOSS;default:return M(39323,{code:n})}}(X=_e||(_e={}))[X.OK=0]="OK",X[X.CANCELLED=1]="CANCELLED",X[X.UNKNOWN=2]="UNKNOWN",X[X.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",X[X.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",X[X.NOT_FOUND=5]="NOT_FOUND",X[X.ALREADY_EXISTS=6]="ALREADY_EXISTS",X[X.PERMISSION_DENIED=7]="PERMISSION_DENIED",X[X.UNAUTHENTICATED=16]="UNAUTHENTICATED",X[X.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",X[X.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",X[X.ABORTED=10]="ABORTED",X[X.OUT_OF_RANGE=11]="OUT_OF_RANGE",X[X.UNIMPLEMENTED=12]="UNIMPLEMENTED",X[X.INTERNAL=13]="INTERNAL",X[X.UNAVAILABLE=14]="UNAVAILABLE",X[X.DATA_LOSS=15]="DATA_LOSS";/**
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
 */function rv(){return new TextEncoder}/**
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
 */const iv=new an([4294967295,4294967295],0);function rf(n){const e=rv().encode(n),t=new fm;return t.update(e),new Uint8Array(t.digest())}function sf(n){const e=new DataView(n.buffer),t=e.getUint32(0,!0),r=e.getUint32(4,!0),i=e.getUint32(8,!0),s=e.getUint32(12,!0);return[new an([t,r],0),new an([i,s],0)]}class el{constructor(e,t,r){if(this.bitmap=e,this.padding=t,this.hashCount=r,t<0||t>=8)throw new Mi(`Invalid padding: ${t}`);if(r<0)throw new Mi(`Invalid hash count: ${r}`);if(e.length>0&&this.hashCount===0)throw new Mi(`Invalid hash count: ${r}`);if(e.length===0&&t!==0)throw new Mi(`Invalid padding when bitmap length is 0: ${t}`);this.ge=8*e.length-t,this.pe=an.fromNumber(this.ge)}ye(e,t,r){let i=e.add(t.multiply(an.fromNumber(r)));return i.compare(iv)===1&&(i=new an([i.getBits(0),i.getBits(1)],0)),i.modulo(this.pe).toNumber()}we(e){return!!(this.bitmap[Math.floor(e/8)]&1<<e%8)}mightContain(e){if(this.ge===0)return!1;const t=rf(e),[r,i]=sf(t);for(let s=0;s<this.hashCount;s++){const o=this.ye(r,i,s);if(!this.we(o))return!1}return!0}static create(e,t,r){const i=e%8==0?0:8-e%8,s=new Uint8Array(Math.ceil(e/8)),o=new el(s,i,t);return r.forEach((c=>o.insert(c))),o}insert(e){if(this.ge===0)return;const t=rf(e),[r,i]=sf(t);for(let s=0;s<this.hashCount;s++){const o=this.ye(r,i,s);this.be(o)}}be(e){const t=Math.floor(e/8),r=e%8;this.bitmap[t]|=1<<r}}class Mi extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}/**
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
 */class Ss{constructor(e,t,r,i,s){this.snapshotVersion=e,this.targetChanges=t,this.targetMismatches=r,this.documentUpdates=i,this.resolvedLimboDocuments=s}static createSynthesizedRemoteEventForCurrentChange(e,t,r){const i=new Map;return i.set(e,Ps.createSynthesizedTargetChangeForCurrentChange(e,t,r)),new Ss(B.min(),i,new se(z),Ye(),W())}}class Ps{constructor(e,t,r,i,s){this.resumeToken=e,this.current=t,this.addedDocuments=r,this.modifiedDocuments=i,this.removedDocuments=s}static createSynthesizedTargetChangeForCurrentChange(e,t,r){return new Ps(r,t,W(),W(),W())}}/**
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
 */class Eo{constructor(e,t,r,i){this.Se=e,this.removedTargetIds=t,this.key=r,this.De=i}}class Eg{constructor(e,t){this.targetId=e,this.Ce=t}}class wg{constructor(e,t,r=ge.EMPTY_BYTE_STRING,i=null){this.state=e,this.targetIds=t,this.resumeToken=r,this.cause=i}}class of{constructor(){this.ve=0,this.Fe=af(),this.Me=ge.EMPTY_BYTE_STRING,this.xe=!1,this.Oe=!0}get current(){return this.xe}get resumeToken(){return this.Me}get Ne(){return this.ve!==0}get Be(){return this.Oe}Le(e){e.approximateByteSize()>0&&(this.Oe=!0,this.Me=e)}ke(){let e=W(),t=W(),r=W();return this.Fe.forEach(((i,s)=>{switch(s){case 0:e=e.add(i);break;case 2:t=t.add(i);break;case 1:r=r.add(i);break;default:M(38017,{changeType:s})}})),new Ps(this.Me,this.xe,e,t,r)}Ke(){this.Oe=!1,this.Fe=af()}qe(e,t){this.Oe=!0,this.Fe=this.Fe.insert(e,t)}Ue(e){this.Oe=!0,this.Fe=this.Fe.remove(e)}$e(){this.ve+=1}We(){this.ve-=1,F(this.ve>=0,3241,{ve:this.ve})}Qe(){this.Oe=!0,this.xe=!0}}class sv{constructor(e){this.Ge=e,this.ze=new Map,this.je=Ye(),this.He=no(),this.Je=no(),this.Ze=new se(z)}Xe(e){for(const t of e.Se)e.De&&e.De.isFoundDocument()?this.Ye(t,e.De):this.et(t,e.key,e.De);for(const t of e.removedTargetIds)this.et(t,e.key,e.De)}tt(e){this.forEachTarget(e,(t=>{const r=this.nt(t);switch(e.state){case 0:this.rt(t)&&r.Le(e.resumeToken);break;case 1:r.We(),r.Ne||r.Ke(),r.Le(e.resumeToken);break;case 2:r.We(),r.Ne||this.removeTarget(t);break;case 3:this.rt(t)&&(r.Qe(),r.Le(e.resumeToken));break;case 4:this.rt(t)&&(this.it(t),r.Le(e.resumeToken));break;default:M(56790,{state:e.state})}}))}forEachTarget(e,t){e.targetIds.length>0?e.targetIds.forEach(t):this.ze.forEach(((r,i)=>{this.rt(i)&&t(i)}))}st(e){const t=e.targetId,r=e.Ce.count,i=this.ot(t);if(i){const s=i.target;if(Fo(s))if(r===0){const o=new x(s.path);this.et(t,o,ce.newNoDocument(o,B.min()))}else F(r===1,20013,{expectedCount:r});else{const o=this._t(t);if(o!==r){const c=this.ut(e),u=c?this.ct(c,e,o):1;if(u!==0){this.it(t);const l=u===2?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.Ze=this.Ze.insert(t,l)}}}}}ut(e){const t=e.Ce.unchangedNames;if(!t||!t.bits)return null;const{bits:{bitmap:r="",padding:i=0},hashCount:s=0}=t;let o,c;try{o=Ot(r).toUint8Array()}catch(u){if(u instanceof Bm)return Dr("Decoding the base64 bloom filter in existence filter failed ("+u.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw u}try{c=new el(o,i,s)}catch(u){return Dr(u instanceof Mi?"BloomFilter error: ":"Applying bloom filter failed: ",u),null}return c.ge===0?null:c}ct(e,t,r){return t.Ce.count===r-this.Pt(e,t.targetId)?0:2}Pt(e,t){const r=this.Ge.getRemoteKeysForTarget(t);let i=0;return r.forEach((s=>{const o=this.Ge.ht(),c=`projects/${o.projectId}/databases/${o.database}/documents/${s.path.canonicalString()}`;e.mightContain(c)||(this.et(t,s,null),i++)})),i}Tt(e){const t=new Map;this.ze.forEach(((s,o)=>{const c=this.ot(o);if(c){if(s.current&&Fo(c.target)){const u=new x(c.target.path);this.It(u).has(o)||this.Et(o,u)||this.et(o,u,ce.newNoDocument(u,e))}s.Be&&(t.set(o,s.ke()),s.Ke())}}));let r=W();this.Je.forEach(((s,o)=>{let c=!0;o.forEachWhile((u=>{const l=this.ot(u);return!l||l.purpose==="TargetPurposeLimboResolution"||(c=!1,!1)})),c&&(r=r.add(s))})),this.je.forEach(((s,o)=>o.setReadTime(e)));const i=new Ss(e,t,this.Ze,this.je,r);return this.je=Ye(),this.He=no(),this.Je=no(),this.Ze=new se(z),i}Ye(e,t){if(!this.rt(e))return;const r=this.Et(e,t.key)?2:0;this.nt(e).qe(t.key,r),this.je=this.je.insert(t.key,t),this.He=this.He.insert(t.key,this.It(t.key).add(e)),this.Je=this.Je.insert(t.key,this.Rt(t.key).add(e))}et(e,t,r){if(!this.rt(e))return;const i=this.nt(e);this.Et(e,t)?i.qe(t,1):i.Ue(t),this.Je=this.Je.insert(t,this.Rt(t).delete(e)),this.Je=this.Je.insert(t,this.Rt(t).add(e)),r&&(this.je=this.je.insert(t,r))}removeTarget(e){this.ze.delete(e)}_t(e){const t=this.nt(e).ke();return this.Ge.getRemoteKeysForTarget(e).size+t.addedDocuments.size-t.removedDocuments.size}$e(e){this.nt(e).$e()}nt(e){let t=this.ze.get(e);return t||(t=new of,this.ze.set(e,t)),t}Rt(e){let t=this.Je.get(e);return t||(t=new re(z),this.Je=this.Je.insert(e,t)),t}It(e){let t=this.He.get(e);return t||(t=new re(z),this.He=this.He.insert(e,t)),t}rt(e){const t=this.ot(e)!==null;return t||k("WatchChangeAggregator","Detected inactive target",e),t}ot(e){const t=this.ze.get(e);return t&&t.Ne?null:this.Ge.At(e)}it(e){this.ze.set(e,new of),this.Ge.getRemoteKeysForTarget(e).forEach((t=>{this.et(e,t,null)}))}Et(e,t){return this.Ge.getRemoteKeysForTarget(e).has(t)}}function no(){return new se(x.comparator)}function af(){return new se(x.comparator)}const ov={asc:"ASCENDING",desc:"DESCENDING"},av={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},cv={and:"AND",or:"OR"};class uv{constructor(e,t){this.databaseId=e,this.useProto3Json=t}}function su(n,e){return n.useProto3Json||ws(e)?e:{value:e}}function Gr(n,e){return n.useProto3Json?`${new Date(1e3*e.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+e.nanoseconds).slice(-9)}Z`:{seconds:""+e.seconds,nanos:e.nanoseconds}}function vg(n,e){return n.useProto3Json?e.toBase64():e.toUint8Array()}function lv(n,e){return Gr(n,e.toTimestamp())}function Re(n){return F(!!n,49232),B.fromTimestamp((function(t){const r=Vt(t);return new te(r.seconds,r.nanos)})(n))}function tl(n,e){return ou(n,e).canonicalString()}function ou(n,e){const t=(function(i){return new ee(["projects",i.projectId,"databases",i.database])})(n).child("documents");return e===void 0?t:t.child(e)}function Ag(n){const e=ee.fromString(n);return F(Vg(e),10190,{key:e.toString()}),e}function hs(n,e){return tl(n.databaseId,e.path)}function kt(n,e){const t=Ag(e);if(t.get(1)!==n.databaseId.projectId)throw new N(P.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+t.get(1)+" vs "+n.databaseId.projectId);if(t.get(3)!==n.databaseId.database)throw new N(P.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+t.get(3)+" vs "+n.databaseId.database);return new x(Sg(t))}function bg(n,e){return tl(n.databaseId,e)}function Rg(n){const e=Ag(n);return e.length===4?ee.emptyPath():Sg(e)}function au(n){return new ee(["projects",n.databaseId.projectId,"databases",n.databaseId.database]).canonicalString()}function Sg(n){return F(n.length>4&&n.get(4)==="documents",29091,{key:n.toString()}),n.popFirst(5)}function cf(n,e,t){return{name:hs(n,e),fields:t.value.mapValue.fields}}function hv(n,e,t){const r=kt(n,e.name),i=Re(e.updateTime),s=e.createTime?Re(e.createTime):B.min(),o=new Pe({mapValue:{fields:e.fields}}),c=ce.newFoundDocument(r,i,s,o);return t&&c.setHasCommittedMutations(),t?c.setHasCommittedMutations():c}function dv(n,e){return"found"in e?(function(r,i){F(!!i.found,43571),i.found.name,i.found.updateTime;const s=kt(r,i.found.name),o=Re(i.found.updateTime),c=i.found.createTime?Re(i.found.createTime):B.min(),u=new Pe({mapValue:{fields:i.found.fields}});return ce.newFoundDocument(s,o,c,u)})(n,e):"missing"in e?(function(r,i){F(!!i.missing,3894),F(!!i.readTime,22933);const s=kt(r,i.missing),o=Re(i.readTime);return ce.newNoDocument(s,o)})(n,e):M(7234,{result:e})}function fv(n,e){let t;if("targetChange"in e){e.targetChange;const r=(function(l){return l==="NO_CHANGE"?0:l==="ADD"?1:l==="REMOVE"?2:l==="CURRENT"?3:l==="RESET"?4:M(39313,{state:l})})(e.targetChange.targetChangeType||"NO_CHANGE"),i=e.targetChange.targetIds||[],s=(function(l,f){return l.useProto3Json?(F(f===void 0||typeof f=="string",58123),ge.fromBase64String(f||"")):(F(f===void 0||f instanceof Buffer||f instanceof Uint8Array,16193),ge.fromUint8Array(f||new Uint8Array))})(n,e.targetChange.resumeToken),o=e.targetChange.cause,c=o&&(function(l){const f=l.code===void 0?P.UNKNOWN:Tg(l.code);return new N(f,l.message||"")})(o);t=new wg(r,i,s,c||null)}else if("documentChange"in e){e.documentChange;const r=e.documentChange;r.document,r.document.name,r.document.updateTime;const i=kt(n,r.document.name),s=Re(r.document.updateTime),o=r.document.createTime?Re(r.document.createTime):B.min(),c=new Pe({mapValue:{fields:r.document.fields}}),u=ce.newFoundDocument(i,s,o,c),l=r.targetIds||[],f=r.removedTargetIds||[];t=new Eo(l,f,u.key,u)}else if("documentDelete"in e){e.documentDelete;const r=e.documentDelete;r.document;const i=kt(n,r.document),s=r.readTime?Re(r.readTime):B.min(),o=ce.newNoDocument(i,s),c=r.removedTargetIds||[];t=new Eo([],c,o.key,o)}else if("documentRemove"in e){e.documentRemove;const r=e.documentRemove;r.document;const i=kt(n,r.document),s=r.removedTargetIds||[];t=new Eo([],s,i,null)}else{if(!("filter"in e))return M(11601,{Vt:e});{e.filter;const r=e.filter;r.targetId;const{count:i=0,unchangedNames:s}=r,o=new nv(i,s),c=r.targetId;t=new Eg(c,o)}}return t}function ds(n,e){let t;if(e instanceof ei)t={update:cf(n,e.key,e.value)};else if(e instanceof ti)t={delete:hs(n,e.key)};else if(e instanceof Ft)t={update:cf(n,e.key,e.data),updateMask:Iv(e.fieldMask)};else{if(!(e instanceof Ju))return M(16599,{dt:e.type});t={verify:hs(n,e.key)}}return e.fieldTransforms.length>0&&(t.updateTransforms=e.fieldTransforms.map((r=>(function(s,o){const c=o.transform;if(c instanceof ls)return{fieldPath:o.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(c instanceof qr)return{fieldPath:o.field.canonicalString(),appendMissingElements:{values:c.elements}};if(c instanceof jr)return{fieldPath:o.field.canonicalString(),removeAllFromArray:{values:c.elements}};if(c instanceof zr)return{fieldPath:o.field.canonicalString(),increment:c.Ae};throw M(20930,{transform:o.transform})})(0,r)))),e.precondition.isNone||(t.currentDocument=(function(i,s){return s.updateTime!==void 0?{updateTime:lv(i,s.updateTime)}:s.exists!==void 0?{exists:s.exists}:M(27497)})(n,e.precondition)),t}function cu(n,e){const t=e.currentDocument?(function(s){return s.updateTime!==void 0?ue.updateTime(Re(s.updateTime)):s.exists!==void 0?ue.exists(s.exists):ue.none()})(e.currentDocument):ue.none(),r=e.updateTransforms?e.updateTransforms.map((i=>(function(o,c){let u=null;if("setToServerValue"in c)F(c.setToServerValue==="REQUEST_TIME",16630,{proto:c}),u=new ls;else if("appendMissingElements"in c){const f=c.appendMissingElements.values||[];u=new qr(f)}else if("removeAllFromArray"in c){const f=c.removeAllFromArray.values||[];u=new jr(f)}else"increment"in c?u=new zr(o,c.increment):M(16584,{proto:c});const l=le.fromServerFormat(c.fieldPath);return new gg(l,u)})(n,i))):[];if(e.update){e.update.name;const i=kt(n,e.update.name),s=new Pe({mapValue:{fields:e.update.fields}});if(e.updateMask){const o=(function(u){const l=u.fieldPaths||[];return new ze(l.map((f=>le.fromServerFormat(f))))})(e.updateMask);return new Ft(i,s,o,t,r)}return new ei(i,s,t,r)}if(e.delete){const i=kt(n,e.delete);return new ti(i,t)}if(e.verify){const i=kt(n,e.verify);return new Ju(i,t)}return M(1463,{proto:e})}function pv(n,e){return n&&n.length>0?(F(e!==void 0,14353),n.map((t=>(function(i,s){let o=i.updateTime?Re(i.updateTime):Re(s);return o.isEqual(B.min())&&(o=Re(s)),new Zw(o,i.transformResults||[])})(t,e)))):[]}function Pg(n,e){return{documents:[bg(n,e.path)]}}function Cg(n,e){const t={structuredQuery:{}},r=e.path;let i;e.collectionGroup!==null?(i=r,t.structuredQuery.from=[{collectionId:e.collectionGroup,allDescendants:!0}]):(i=r.popLast(),t.structuredQuery.from=[{collectionId:r.lastSegment()}]),t.parent=bg(n,i);const s=(function(l){if(l.length!==0)return Ng(ne.create(l,"and"))})(e.filters);s&&(t.structuredQuery.where=s);const o=(function(l){if(l.length!==0)return l.map((f=>(function(g){return{field:yr(g.field),direction:gv(g.dir)}})(f)))})(e.orderBy);o&&(t.structuredQuery.orderBy=o);const c=su(n,e.limit);return c!==null&&(t.structuredQuery.limit=c),e.startAt&&(t.structuredQuery.startAt=(function(l){return{before:l.inclusive,values:l.position}})(e.startAt)),e.endAt&&(t.structuredQuery.endAt=(function(l){return{before:!l.inclusive,values:l.position}})(e.endAt)),{ft:t,parent:i}}function kg(n){let e=Rg(n.parent);const t=n.structuredQuery,r=t.from?t.from.length:0;let i=null;if(r>0){F(r===1,65062);const f=t.from[0];f.allDescendants?i=f.collectionId:e=e.child(f.collectionId)}let s=[];t.where&&(s=(function(p){const g=Dg(p);return g instanceof ne&&Hu(g)?g.getFilters():[g]})(t.where));let o=[];t.orderBy&&(o=(function(p){return p.map((g=>(function(C){return new us(Ir(C.field),(function(D){switch(D){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}})(C.direction))})(g)))})(t.orderBy));let c=null;t.limit&&(c=(function(p){let g;return g=typeof p=="object"?p.value:p,ws(g)?null:g})(t.limit));let u=null;t.startAt&&(u=(function(p){const g=!!p.before,A=p.values||[];return new Br(A,g)})(t.startAt));let l=null;return t.endAt&&(l=(function(p){const g=!p.before,A=p.values||[];return new Br(A,g)})(t.endAt)),ng(e,i,o,s,c,"F",u,l)}function mv(n,e){const t=(function(i){switch(i){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return M(28987,{purpose:i})}})(e.purpose);return t==null?null:{"goog-listen-tags":t}}function Dg(n){return n.unaryFilter!==void 0?(function(t){switch(t.unaryFilter.op){case"IS_NAN":const r=Ir(t.unaryFilter.field);return Y.create(r,"==",{doubleValue:NaN});case"IS_NULL":const i=Ir(t.unaryFilter.field);return Y.create(i,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const s=Ir(t.unaryFilter.field);return Y.create(s,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const o=Ir(t.unaryFilter.field);return Y.create(o,"!=",{nullValue:"NULL_VALUE"});case"OPERATOR_UNSPECIFIED":return M(61313);default:return M(60726)}})(n):n.fieldFilter!==void 0?(function(t){return Y.create(Ir(t.fieldFilter.field),(function(i){switch(i){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";case"OPERATOR_UNSPECIFIED":return M(58110);default:return M(50506)}})(t.fieldFilter.op),t.fieldFilter.value)})(n):n.compositeFilter!==void 0?(function(t){return ne.create(t.compositeFilter.filters.map((r=>Dg(r))),(function(i){switch(i){case"AND":return"and";case"OR":return"or";default:return M(1026)}})(t.compositeFilter.op))})(n):M(30097,{filter:n})}function gv(n){return ov[n]}function _v(n){return av[n]}function yv(n){return cv[n]}function yr(n){return{fieldPath:n.canonicalString()}}function Ir(n){return le.fromServerFormat(n.fieldPath)}function Ng(n){return n instanceof Y?(function(t){if(t.op==="=="){if(Gd(t.value))return{unaryFilter:{field:yr(t.field),op:"IS_NAN"}};if(zd(t.value))return{unaryFilter:{field:yr(t.field),op:"IS_NULL"}}}else if(t.op==="!="){if(Gd(t.value))return{unaryFilter:{field:yr(t.field),op:"IS_NOT_NAN"}};if(zd(t.value))return{unaryFilter:{field:yr(t.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:yr(t.field),op:_v(t.op),value:t.value}}})(n):n instanceof ne?(function(t){const r=t.getFilters().map((i=>Ng(i)));return r.length===1?r[0]:{compositeFilter:{op:yv(t.op),filters:r}}})(n):M(54877,{filter:n})}function Iv(n){const e=[];return n.fields.forEach((t=>e.push(t.canonicalString()))),{fieldPaths:e}}function Vg(n){return n.length>=4&&n.get(0)==="projects"&&n.get(2)==="databases"}function Og(n){return!!n&&typeof n._toProto=="function"&&n._protoValueType==="ProtoValue"}/**
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
 */class St{constructor(e,t,r,i,s=B.min(),o=B.min(),c=ge.EMPTY_BYTE_STRING,u=null){this.target=e,this.targetId=t,this.purpose=r,this.sequenceNumber=i,this.snapshotVersion=s,this.lastLimboFreeSnapshotVersion=o,this.resumeToken=c,this.expectedCount=u}withSequenceNumber(e){return new St(this.target,this.targetId,this.purpose,e,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount)}withResumeToken(e,t){return new St(this.target,this.targetId,this.purpose,this.sequenceNumber,t,this.lastLimboFreeSnapshotVersion,e,null)}withExpectedCount(e){return new St(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,e)}withLastLimboFreeSnapshotVersion(e){return new St(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,e,this.resumeToken,this.expectedCount)}}/**
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
 */class xg{constructor(e){this.yt=e}}function Tv(n,e){let t;if(e.document)t=hv(n.yt,e.document,!!e.hasCommittedMutations);else if(e.noDocument){const r=x.fromSegments(e.noDocument.path),i=Jn(e.noDocument.readTime);t=ce.newNoDocument(r,i),e.hasCommittedMutations&&t.setHasCommittedMutations()}else{if(!e.unknownDocument)return M(56709);{const r=x.fromSegments(e.unknownDocument.path),i=Jn(e.unknownDocument.version);t=ce.newUnknownDocument(r,i)}}return e.readTime&&t.setReadTime((function(i){const s=new te(i[0],i[1]);return B.fromTimestamp(s)})(e.readTime)),t}function uf(n,e){const t=e.key,r={prefixPath:t.getCollectionPath().popLast().toArray(),collectionGroup:t.collectionGroup,documentId:t.path.lastSegment(),readTime:Bo(e.readTime),hasCommittedMutations:e.hasCommittedMutations};if(e.isFoundDocument())r.document=(function(s,o){return{name:hs(s,o.key),fields:o.data.value.mapValue.fields,updateTime:Gr(s,o.version.toTimestamp()),createTime:Gr(s,o.createTime.toTimestamp())}})(n.yt,e);else if(e.isNoDocument())r.noDocument={path:t.path.toArray(),readTime:Qn(e.version)};else{if(!e.isUnknownDocument())return M(57904,{document:e});r.unknownDocument={path:t.path.toArray(),version:Qn(e.version)}}return r}function Bo(n){const e=n.toTimestamp();return[e.seconds,e.nanoseconds]}function Qn(n){const e=n.toTimestamp();return{seconds:e.seconds,nanoseconds:e.nanoseconds}}function Jn(n){const e=new te(n.seconds,n.nanoseconds);return B.fromTimestamp(e)}function Mn(n,e){const t=(e.baseMutations||[]).map((s=>cu(n.yt,s)));for(let s=0;s<e.mutations.length-1;++s){const o=e.mutations[s];if(s+1<e.mutations.length&&e.mutations[s+1].transform!==void 0){const c=e.mutations[s+1];o.updateTransforms=c.transform.fieldTransforms,e.mutations.splice(s+1,1),++s}}const r=e.mutations.map((s=>cu(n.yt,s))),i=te.fromMillis(e.localWriteTimeMs);return new Yu(e.batchId,i,t,r)}function Li(n){const e=Jn(n.readTime),t=n.lastLimboFreeSnapshotVersion!==void 0?Jn(n.lastLimboFreeSnapshotVersion):B.min();let r;return r=(function(s){return s.documents!==void 0})(n.query)?(function(s){const o=s.documents.length;return F(o===1,1966,{count:o}),Ze(bs(Rg(s.documents[0])))})(n.query):(function(s){return Ze(kg(s))})(n.query),new St(r,n.targetId,"TargetPurposeListen",n.lastListenSequenceNumber,e,t,ge.fromBase64String(n.resumeToken))}function Mg(n,e){const t=Qn(e.snapshotVersion),r=Qn(e.lastLimboFreeSnapshotVersion);let i;i=Fo(e.target)?Pg(n.yt,e.target):Cg(n.yt,e.target).ft;const s=e.resumeToken.toBase64();return{targetId:e.targetId,canonicalId:Wn(e.target),readTime:t,resumeToken:s,lastListenSequenceNumber:e.sequenceNumber,lastLimboFreeSnapshotVersion:r,query:i}}function Lg(n){const e=kg({parent:n.parent,structuredQuery:n.structuredQuery});return n.limitType==="LAST"?iu(e,e.limit,"L"):e}function yc(n,e){return new Zu(e.largestBatchId,cu(n.yt,e.overlayMutation))}function lf(n,e){const t=e.path.lastSegment();return[n,Oe(e.path.popLast()),t]}function hf(n,e,t,r){return{indexId:n,uid:e,sequenceNumber:t,readTime:Qn(r.readTime),documentKey:Oe(r.documentKey.path),largestBatchId:r.largestBatchId}}/**
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
 */class Ev{getBundleMetadata(e,t){return df(e).get(t).next((r=>{if(r)return(function(s){return{id:s.bundleId,createTime:Jn(s.createTime),version:s.version}})(r)}))}saveBundleMetadata(e,t){return df(e).put((function(i){return{bundleId:i.id,createTime:Qn(Re(i.createTime)),version:i.version}})(t))}getNamedQuery(e,t){return ff(e).get(t).next((r=>{if(r)return(function(s){return{name:s.name,query:Lg(s.bundledQuery),readTime:Jn(s.readTime)}})(r)}))}saveNamedQuery(e,t){return ff(e).put((function(i){return{name:i.name,readTime:Qn(Re(i.readTime)),bundledQuery:i.bundledQuery}})(t))}}function df(n){return we(n,fa)}function ff(n){return we(n,pa)}/**
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
 */class Ea{constructor(e,t){this.serializer=e,this.userId=t}static wt(e,t){const r=t.uid||"";return new Ea(e,r)}getOverlay(e,t){return bi(e).get(lf(this.userId,t)).next((r=>r?yc(this.serializer,r):null))}getOverlays(e,t){const r=It();return v.forEach(t,(i=>this.getOverlay(e,i).next((s=>{s!==null&&r.set(i,s)})))).next((()=>r))}saveOverlays(e,t,r){const i=[];return r.forEach(((s,o)=>{const c=new Zu(t,o);i.push(this.bt(e,c))})),v.waitFor(i)}removeOverlaysForBatchId(e,t,r){const i=new Set;t.forEach((o=>i.add(Oe(o.getCollectionPath()))));const s=[];return i.forEach((o=>{const c=IDBKeyRange.bound([this.userId,o,r],[this.userId,o,r+1],!1,!0);s.push(bi(e).X(Jc,c))})),v.waitFor(s)}getOverlaysForCollection(e,t,r){const i=It(),s=Oe(t),o=IDBKeyRange.bound([this.userId,s,r],[this.userId,s,Number.POSITIVE_INFINITY],!0);return bi(e).H(Jc,o).next((c=>{for(const u of c){const l=yc(this.serializer,u);i.set(l.getKey(),l)}return i}))}getOverlaysForCollectionGroup(e,t,r,i){const s=It();let o;const c=IDBKeyRange.bound([this.userId,t,r],[this.userId,t,Number.POSITIVE_INFINITY],!0);return bi(e).ee({index:Om,range:c},((u,l,f)=>{const p=yc(this.serializer,l);s.size()<i||p.largestBatchId===o?(s.set(p.getKey(),p),o=p.largestBatchId):f.done()})).next((()=>s))}bt(e,t){return bi(e).put((function(i,s,o){const[c,u,l]=lf(s,o.mutation.key);return{userId:s,collectionPath:u,documentId:l,collectionGroup:o.mutation.key.getCollectionGroup(),largestBatchId:o.largestBatchId,overlayMutation:ds(i.yt,o.mutation)}})(this.serializer,this.userId,t))}}function bi(n){return we(n,ma)}/**
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
 */class wv{St(e){return we(e,qu)}getSessionToken(e){return this.St(e).get("sessionToken").next((t=>{const r=t?.value;return r?ge.fromUint8Array(r):ge.EMPTY_BYTE_STRING}))}setSessionToken(e,t){return this.St(e).put({name:"sessionToken",value:t.toUint8Array()})}}/**
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
 */class Ln{constructor(){}Dt(e,t){this.Ct(e,t),t.vt()}Ct(e,t){if("nullValue"in e)this.Ft(t,5);else if("booleanValue"in e)this.Ft(t,10),t.Mt(e.booleanValue?1:0);else if("integerValue"in e)this.Ft(t,15),t.Mt(ae(e.integerValue));else if("doubleValue"in e){const r=ae(e.doubleValue);isNaN(r)?this.Ft(t,13):(this.Ft(t,15),ts(r)?t.Mt(0):t.Mt(r))}else if("timestampValue"in e){let r=e.timestampValue;this.Ft(t,20),typeof r=="string"&&(r=Vt(r)),t.xt(`${r.seconds||""}`),t.Mt(r.nanos||0)}else if("stringValue"in e)this.Ot(e.stringValue,t),this.Nt(t);else if("bytesValue"in e)this.Ft(t,30),t.Bt(Ot(e.bytesValue)),this.Nt(t);else if("referenceValue"in e)this.Lt(e.referenceValue,t);else if("geoPointValue"in e){const r=e.geoPointValue;this.Ft(t,45),t.Mt(r.latitude||0),t.Mt(r.longitude||0)}else"mapValue"in e?Km(e)?this.Ft(t,Number.MAX_SAFE_INTEGER):_a(e)?this.kt(e.mapValue,t):(this.Kt(e.mapValue,t),this.Nt(t)):"arrayValue"in e?(this.qt(e.arrayValue,t),this.Nt(t)):M(19022,{Ut:e})}Ot(e,t){this.Ft(t,25),this.$t(e,t)}$t(e,t){t.xt(e)}Kt(e,t){const r=e.fields||{};this.Ft(t,55);for(const i of Object.keys(r))this.Ot(i,t),this.Ct(r[i],t)}kt(e,t){const r=e.fields||{};this.Ft(t,53);const i=Fr,s=r[i].arrayValue?.values?.length||0;this.Ft(t,15),t.Mt(ae(s)),this.Ot(i,t),this.Ct(r[i],t)}qt(e,t){const r=e.values||[];this.Ft(t,50);for(const i of r)this.Ct(i,t)}Lt(e,t){this.Ft(t,37),x.fromName(e).path.forEach((r=>{this.Ft(t,60),this.$t(r,t)}))}Ft(e,t){e.Mt(t)}Nt(e){e.Mt(2)}}Ln.Wt=new Ln;/**
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
 */const dr=255;function vv(n){if(n===0)return 8;let e=0;return n>>4||(e+=4,n<<=4),n>>6||(e+=2,n<<=2),n>>7||(e+=1),e}function pf(n){const e=64-(function(r){let i=0;for(let s=0;s<8;++s){const o=vv(255&r[s]);if(i+=o,o!==8)break}return i})(n);return Math.ceil(e/8)}class Av{constructor(){this.buffer=new Uint8Array(1024),this.position=0}Qt(e){const t=e[Symbol.iterator]();let r=t.next();for(;!r.done;)this.Gt(r.value),r=t.next();this.zt()}jt(e){const t=e[Symbol.iterator]();let r=t.next();for(;!r.done;)this.Ht(r.value),r=t.next();this.Jt()}Zt(e){for(const t of e){const r=t.charCodeAt(0);if(r<128)this.Gt(r);else if(r<2048)this.Gt(960|r>>>6),this.Gt(128|63&r);else if(t<"\uD800"||"\uDBFF"<t)this.Gt(480|r>>>12),this.Gt(128|63&r>>>6),this.Gt(128|63&r);else{const i=t.codePointAt(0);this.Gt(240|i>>>18),this.Gt(128|63&i>>>12),this.Gt(128|63&i>>>6),this.Gt(128|63&i)}}this.zt()}Xt(e){for(const t of e){const r=t.charCodeAt(0);if(r<128)this.Ht(r);else if(r<2048)this.Ht(960|r>>>6),this.Ht(128|63&r);else if(t<"\uD800"||"\uDBFF"<t)this.Ht(480|r>>>12),this.Ht(128|63&r>>>6),this.Ht(128|63&r);else{const i=t.codePointAt(0);this.Ht(240|i>>>18),this.Ht(128|63&i>>>12),this.Ht(128|63&i>>>6),this.Ht(128|63&i)}}this.Jt()}Yt(e){const t=this.en(e),r=pf(t);this.tn(1+r),this.buffer[this.position++]=255&r;for(let i=t.length-r;i<t.length;++i)this.buffer[this.position++]=255&t[i]}nn(e){const t=this.en(e),r=pf(t);this.tn(1+r),this.buffer[this.position++]=~(255&r);for(let i=t.length-r;i<t.length;++i)this.buffer[this.position++]=~(255&t[i])}rn(){this.sn(dr),this.sn(255)}_n(){this.an(dr),this.an(255)}reset(){this.position=0}seed(e){this.tn(e.length),this.buffer.set(e,this.position),this.position+=e.length}un(){return this.buffer.slice(0,this.position)}en(e){const t=(function(s){const o=new DataView(new ArrayBuffer(8));return o.setFloat64(0,s,!1),new Uint8Array(o.buffer)})(e),r=!!(128&t[0]);t[0]^=r?255:128;for(let i=1;i<t.length;++i)t[i]^=r?255:0;return t}Gt(e){const t=255&e;t===0?(this.sn(0),this.sn(255)):t===dr?(this.sn(dr),this.sn(0)):this.sn(t)}Ht(e){const t=255&e;t===0?(this.an(0),this.an(255)):t===dr?(this.an(dr),this.an(0)):this.an(e)}zt(){this.sn(0),this.sn(1)}Jt(){this.an(0),this.an(1)}sn(e){this.tn(1),this.buffer[this.position++]=e}an(e){this.tn(1),this.buffer[this.position++]=~e}tn(e){const t=e+this.position;if(t<=this.buffer.length)return;let r=2*this.buffer.length;r<t&&(r=t);const i=new Uint8Array(r);i.set(this.buffer),this.buffer=i}}class bv{constructor(e){this.cn=e}Bt(e){this.cn.Qt(e)}xt(e){this.cn.Zt(e)}Mt(e){this.cn.Yt(e)}vt(){this.cn.rn()}}class Rv{constructor(e){this.cn=e}Bt(e){this.cn.jt(e)}xt(e){this.cn.Xt(e)}Mt(e){this.cn.nn(e)}vt(){this.cn._n()}}class Ri{constructor(){this.cn=new Av,this.ascending=new bv(this.cn),this.descending=new Rv(this.cn)}seed(e){this.cn.seed(e)}ln(e){return e===0?this.ascending:this.descending}un(){return this.cn.un()}reset(){this.cn.reset()}}/**
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
 */class Fn{constructor(e,t,r,i){this.hn=e,this.Pn=t,this.Tn=r,this.In=i}En(){const e=this.In.length,t=e===0||this.In[e-1]===255?e+1:e,r=new Uint8Array(t);return r.set(this.In,0),t!==e?r.set([0],this.In.length):++r[r.length-1],new Fn(this.hn,this.Pn,this.Tn,r)}Rn(e,t,r){return{indexId:this.hn,uid:e,arrayValue:wo(this.Tn),directionalValue:wo(this.In),orderedDocumentKey:wo(t),documentKey:r.path.toArray()}}An(e,t,r){const i=this.Rn(e,t,r);return[i.indexId,i.uid,i.arrayValue,i.directionalValue,i.orderedDocumentKey,i.documentKey]}}function Gt(n,e){let t=n.hn-e.hn;return t!==0?t:(t=mf(n.Tn,e.Tn),t!==0?t:(t=mf(n.In,e.In),t!==0?t:x.comparator(n.Pn,e.Pn)))}function mf(n,e){for(let t=0;t<n.length&&t<e.length;++t){const r=n[t]-e[t];if(r!==0)return r}return n.length-e.length}function wo(n){return am()?(function(t){let r="";for(let i=0;i<t.length;i++)r+=String.fromCharCode(t[i]);return r})(n):n}function gf(n){return typeof n!="string"?n:(function(t){const r=new Uint8Array(t.length);for(let i=0;i<t.length;i++)r[i]=t.charCodeAt(i);return r})(n)}class _f{constructor(e){this.Vn=new re(((t,r)=>le.comparator(t.field,r.field))),this.collectionId=e.collectionGroup!=null?e.collectionGroup:e.path.lastSegment(),this.dn=e.orderBy,this.mn=[];for(const t of e.filters){const r=t;r.isInequality()?this.Vn=this.Vn.add(r):this.mn.push(r)}}get fn(){return this.Vn.size>1}gn(e){if(F(e.collectionGroup===this.collectionId,49279),this.fn)return!1;const t=Hc(e);if(t!==void 0&&!this.pn(t))return!1;const r=Vn(e);let i=new Set,s=0,o=0;for(;s<r.length&&this.pn(r[s]);++s)i=i.add(r[s].fieldPath.canonicalString());if(s===r.length)return!0;if(this.Vn.size>0){const c=this.Vn.getIterator().getNext();if(!i.has(c.field.canonicalString())){const u=r[s];if(!this.yn(c,u)||!this.wn(this.dn[o++],u))return!1}++s}for(;s<r.length;++s){const c=r[s];if(o>=this.dn.length||!this.wn(this.dn[o++],c))return!1}return!0}bn(){if(this.fn)return null;let e=new re(le.comparator);const t=[];for(const r of this.mn)if(!r.field.isKeyField())if(r.op==="array-contains"||r.op==="array-contains-any")t.push(new po(r.field,2));else{if(e.has(r.field))continue;e=e.add(r.field),t.push(new po(r.field,0))}for(const r of this.dn)r.field.isKeyField()||e.has(r.field)||(e=e.add(r.field),t.push(new po(r.field,r.dir==="asc"?0:1)));return new Vo(Vo.UNKNOWN_ID,this.collectionId,t,es.empty())}pn(e){for(const t of this.mn)if(this.yn(t,e))return!0;return!1}yn(e,t){if(e===void 0||!e.field.isEqual(t.fieldPath))return!1;const r=e.op==="array-contains"||e.op==="array-contains-any";return t.kind===2===r}wn(e,t){return!!e.field.isEqual(t.fieldPath)&&(t.kind===0&&e.dir==="asc"||t.kind===1&&e.dir==="desc")}}/**
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
 */function Fg(n){if(F(n instanceof Y||n instanceof ne,20012),n instanceof Y){if(n instanceof tg){const t=n.value.arrayValue?.values?.map((r=>Y.create(n.field,"==",r)))||[];return ne.create(t,"or")}return n}const e=n.filters.map((t=>Fg(t)));return ne.create(e,n.op)}function Sv(n){if(n.getFilters().length===0)return[];const e=hu(Fg(n));return F(Ug(e),7391),uu(e)||lu(e)?[e]:e.getFilters()}function uu(n){return n instanceof Y}function lu(n){return n instanceof ne&&Hu(n)}function Ug(n){return uu(n)||lu(n)||(function(t){if(t instanceof ne&&eu(t)){for(const r of t.getFilters())if(!uu(r)&&!lu(r))return!1;return!0}return!1})(n)}function hu(n){if(F(n instanceof Y||n instanceof ne,34018),n instanceof Y)return n;if(n.filters.length===1)return hu(n.filters[0]);const e=n.filters.map((r=>hu(r)));let t=ne.create(e,n.op);return t=$o(t),Ug(t)?t:(F(t instanceof ne,64498),F($r(t),40251),F(t.filters.length>1,57927),t.filters.reduce(((r,i)=>nl(r,i))))}function nl(n,e){let t;return F(n instanceof Y||n instanceof ne,38388),F(e instanceof Y||e instanceof ne,25473),t=n instanceof Y?e instanceof Y?(function(i,s){return ne.create([i,s],"and")})(n,e):yf(n,e):e instanceof Y?yf(e,n):(function(i,s){if(F(i.filters.length>0&&s.filters.length>0,48005),$r(i)&&$r(s))return Xm(i,s.getFilters());const o=eu(i)?i:s,c=eu(i)?s:i,u=o.filters.map((l=>nl(l,c)));return ne.create(u,"or")})(n,e),$o(t)}function yf(n,e){if($r(e))return Xm(e,n.getFilters());{const t=e.filters.map((r=>nl(n,r)));return ne.create(t,"or")}}function $o(n){if(F(n instanceof Y||n instanceof ne,11850),n instanceof Y)return n;const e=n.getFilters();if(e.length===1)return $o(e[0]);if(Jm(n))return n;const t=e.map((i=>$o(i))),r=[];return t.forEach((i=>{i instanceof Y?r.push(i):i instanceof ne&&(i.op===n.op?r.push(...i.filters):r.push(i))})),r.length===1?r[0]:ne.create(r,n.op)}/**
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
 */class Pv{constructor(){this.Sn=new rl}addToCollectionParentIndex(e,t){return this.Sn.add(t),v.resolve()}getCollectionParents(e,t){return v.resolve(this.Sn.getEntries(t))}addFieldIndex(e,t){return v.resolve()}deleteFieldIndex(e,t){return v.resolve()}deleteAllFieldIndexes(e){return v.resolve()}createTargetIndexes(e,t){return v.resolve()}getDocumentsMatchingTarget(e,t){return v.resolve(null)}getIndexType(e,t){return v.resolve(0)}getFieldIndexes(e,t){return v.resolve([])}getNextCollectionGroupToUpdate(e){return v.resolve(null)}getMinOffset(e,t){return v.resolve(nt.min())}getMinOffsetFromCollectionGroup(e,t){return v.resolve(nt.min())}updateCollectionGroup(e,t,r){return v.resolve()}updateIndexEntries(e,t){return v.resolve()}}class rl{constructor(){this.index={}}add(e){const t=e.lastSegment(),r=e.popLast(),i=this.index[t]||new re(ee.comparator),s=!i.has(r);return this.index[t]=i.add(r),s}has(e){const t=e.lastSegment(),r=e.popLast(),i=this.index[t];return i&&i.has(r)}getEntries(e){return(this.index[e]||new re(ee.comparator)).toArray()}}/**
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
 */const If="IndexedDbIndexManager",ro=new Uint8Array(0);class Cv{constructor(e,t){this.databaseId=t,this.Dn=new rl,this.Cn=new Lt((r=>Wn(r)),((r,i)=>As(r,i))),this.uid=e.uid||""}addToCollectionParentIndex(e,t){if(!this.Dn.has(t)){const r=t.lastSegment(),i=t.popLast();e.addOnCommittedListener((()=>{this.Dn.add(t)}));const s={collectionId:r,parent:Oe(i)};return Tf(e).put(s)}return v.resolve()}getCollectionParents(e,t){const r=[],i=IDBKeyRange.bound([t,""],[Tm(t),""],!1,!0);return Tf(e).H(i).next((s=>{for(const o of s){if(o.collectionId!==t)break;r.push(yt(o.parent))}return r}))}addFieldIndex(e,t){const r=Si(e),i=(function(c){return{indexId:c.indexId,collectionGroup:c.collectionGroup,fields:c.fields.map((u=>[u.fieldPath.canonicalString(),u.kind]))}})(t);delete i.indexId;const s=r.add(i);if(t.indexState){const o=pr(e);return s.next((c=>{o.put(hf(c,this.uid,t.indexState.sequenceNumber,t.indexState.offset))}))}return s.next()}deleteFieldIndex(e,t){const r=Si(e),i=pr(e),s=fr(e);return r.delete(t.indexId).next((()=>i.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0)))).next((()=>s.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0))))}deleteAllFieldIndexes(e){const t=Si(e),r=fr(e),i=pr(e);return t.X().next((()=>r.X())).next((()=>i.X()))}createTargetIndexes(e,t){return v.forEach(this.vn(t),(r=>this.getIndexType(e,r).next((i=>{if(i===0||i===1){const s=new _f(r).bn();if(s!=null)return this.addFieldIndex(e,s)}}))))}getDocumentsMatchingTarget(e,t){const r=fr(e);let i=!0;const s=new Map;return v.forEach(this.vn(t),(o=>this.Fn(e,o).next((c=>{i&&(i=!!c),s.set(o,c)})))).next((()=>{if(i){let o=W();const c=[];return v.forEach(s,((u,l)=>{k(If,`Using index ${(function(U){return`id=${U.indexId}|cg=${U.collectionGroup}|f=${U.fields.map((G=>`${G.fieldPath}:${G.kind}`)).join(",")}`})(u)} to execute ${Wn(t)}`);const f=(function(U,G){const Z=Hc(G);if(Z===void 0)return null;for(const Q of Uo(U,Z.fieldPath))switch(Q.op){case"array-contains-any":return Q.value.arrayValue.values||[];case"array-contains":return[Q.value]}return null})(l,u),p=(function(U,G){const Z=new Map;for(const Q of Vn(G))for(const T of Uo(U,Q.fieldPath))switch(T.op){case"==":case"in":Z.set(Q.fieldPath.canonicalString(),T.value);break;case"not-in":case"!=":return Z.set(Q.fieldPath.canonicalString(),T.value),Array.from(Z.values())}return null})(l,u),g=(function(U,G){const Z=[];let Q=!0;for(const T of Vn(G)){const _=T.kind===0?Jd(U,T.fieldPath,U.startAt):Yd(U,T.fieldPath,U.startAt);Z.push(_.value),Q&&(Q=_.inclusive)}return new Br(Z,Q)})(l,u),A=(function(U,G){const Z=[];let Q=!0;for(const T of Vn(G)){const _=T.kind===0?Yd(U,T.fieldPath,U.endAt):Jd(U,T.fieldPath,U.endAt);Z.push(_.value),Q&&(Q=_.inclusive)}return new Br(Z,Q)})(l,u),C=this.Mn(u,l,g),V=this.Mn(u,l,A),D=this.xn(u,l,p),j=this.On(u.indexId,f,C,g.inclusive,V,A.inclusive,D);return v.forEach(j,(q=>r.Z(q,t.limit).next((U=>{U.forEach((G=>{const Z=x.fromSegments(G.documentKey);o.has(Z)||(o=o.add(Z),c.push(Z))}))}))))})).next((()=>c))}return v.resolve(null)}))}vn(e){let t=this.Cn.get(e);return t||(e.filters.length===0?t=[e]:t=Sv(ne.create(e.filters,"and")).map((r=>nu(e.path,e.collectionGroup,e.orderBy,r.getFilters(),e.limit,e.startAt,e.endAt))),this.Cn.set(e,t),t)}On(e,t,r,i,s,o,c){const u=(t!=null?t.length:1)*Math.max(r.length,s.length),l=u/(t!=null?t.length:1),f=[];for(let p=0;p<u;++p){const g=t?this.Nn(t[p/l]):ro,A=this.Bn(e,g,r[p%l],i),C=this.Ln(e,g,s[p%l],o),V=c.map((D=>this.Bn(e,g,D,!0)));f.push(...this.createRange(A,C,V))}return f}Bn(e,t,r,i){const s=new Fn(e,x.empty(),t,r);return i?s:s.En()}Ln(e,t,r,i){const s=new Fn(e,x.empty(),t,r);return i?s.En():s}Fn(e,t){const r=new _f(t),i=t.collectionGroup!=null?t.collectionGroup:t.path.lastSegment();return this.getFieldIndexes(e,i).next((s=>{let o=null;for(const c of s)r.gn(c)&&(!o||c.fields.length>o.fields.length)&&(o=c);return o}))}getIndexType(e,t){let r=2;const i=this.vn(t);return v.forEach(i,(s=>this.Fn(e,s).next((o=>{o?r!==0&&o.fields.length<(function(u){let l=new re(le.comparator),f=!1;for(const p of u.filters)for(const g of p.getFlattenedFilters())g.field.isKeyField()||(g.op==="array-contains"||g.op==="array-contains-any"?f=!0:l=l.add(g.field));for(const p of u.orderBy)p.field.isKeyField()||(l=l.add(p.field));return l.size+(f?1:0)})(s)&&(r=1):r=0})))).next((()=>(function(o){return o.limit!==null})(t)&&i.length>1&&r===2?1:r))}kn(e,t){const r=new Ri;for(const i of Vn(e)){const s=t.data.field(i.fieldPath);if(s==null)return null;const o=r.ln(i.kind);Ln.Wt.Dt(s,o)}return r.un()}Nn(e){const t=new Ri;return Ln.Wt.Dt(e,t.ln(0)),t.un()}Kn(e,t){const r=new Ri;return Ln.Wt.Dt(as(this.databaseId,t),r.ln((function(s){const o=Vn(s);return o.length===0?0:o[o.length-1].kind})(e))),r.un()}xn(e,t,r){if(r===null)return[];let i=[];i.push(new Ri);let s=0;for(const o of Vn(e)){const c=r[s++];for(const u of i)if(this.qn(t,o.fieldPath)&&cs(c))i=this.Un(i,o,c);else{const l=u.ln(o.kind);Ln.Wt.Dt(c,l)}}return this.$n(i)}Mn(e,t,r){return this.xn(e,t,r.position)}$n(e){const t=[];for(let r=0;r<e.length;++r)t[r]=e[r].un();return t}Un(e,t,r){const i=[...e],s=[];for(const o of r.arrayValue.values||[])for(const c of i){const u=new Ri;u.seed(c.un()),Ln.Wt.Dt(o,u.ln(t.kind)),s.push(u)}return s}qn(e,t){return!!e.filters.find((r=>r instanceof Y&&r.field.isEqual(t)&&(r.op==="in"||r.op==="not-in")))}getFieldIndexes(e,t){const r=Si(e),i=pr(e);return(t?r.H(Qc,IDBKeyRange.bound(t,t)):r.H()).next((s=>{const o=[];return v.forEach(s,(c=>i.get([c.indexId,this.uid]).next((u=>{o.push((function(f,p){const g=p?new es(p.sequenceNumber,new nt(Jn(p.readTime),new x(yt(p.documentKey)),p.largestBatchId)):es.empty(),A=f.fields.map((([C,V])=>new po(le.fromServerFormat(C),V)));return new Vo(f.indexId,f.collectionGroup,A,g)})(c,u))})))).next((()=>o))}))}getNextCollectionGroupToUpdate(e){return this.getFieldIndexes(e).next((t=>t.length===0?null:(t.sort(((r,i)=>{const s=r.indexState.sequenceNumber-i.indexState.sequenceNumber;return s!==0?s:z(r.collectionGroup,i.collectionGroup)})),t[0].collectionGroup)))}updateCollectionGroup(e,t,r){const i=Si(e),s=pr(e);return this.Wn(e).next((o=>i.H(Qc,IDBKeyRange.bound(t,t)).next((c=>v.forEach(c,(u=>s.put(hf(u.indexId,this.uid,o,r))))))))}updateIndexEntries(e,t){const r=new Map;return v.forEach(t,((i,s)=>{const o=r.get(i.collectionGroup);return(o?v.resolve(o):this.getFieldIndexes(e,i.collectionGroup)).next((c=>(r.set(i.collectionGroup,c),v.forEach(c,(u=>this.Qn(e,i,u).next((l=>{const f=this.Gn(s,u);return l.isEqual(f)?v.resolve():this.zn(e,s,u,l,f)})))))))}))}jn(e,t,r,i){return fr(e).put(i.Rn(this.uid,this.Kn(r,t.key),t.key))}Hn(e,t,r,i){return fr(e).delete(i.An(this.uid,this.Kn(r,t.key),t.key))}Qn(e,t,r){const i=fr(e);let s=new re(Gt);return i.ee({index:Vm,range:IDBKeyRange.only([r.indexId,this.uid,wo(this.Kn(r,t))])},((o,c)=>{s=s.add(new Fn(r.indexId,t,gf(c.arrayValue),gf(c.directionalValue)))})).next((()=>s))}Gn(e,t){let r=new re(Gt);const i=this.kn(t,e);if(i==null)return r;const s=Hc(t);if(s!=null){const o=e.data.field(s.fieldPath);if(cs(o))for(const c of o.arrayValue.values||[])r=r.add(new Fn(t.indexId,e.key,this.Nn(c),i))}else r=r.add(new Fn(t.indexId,e.key,ro,i));return r}zn(e,t,r,i,s){k(If,"Updating index entries for document '%s'",t.key);const o=[];return(function(u,l,f,p,g){const A=u.getIterator(),C=l.getIterator();let V=hr(A),D=hr(C);for(;V||D;){let j=!1,q=!1;if(V&&D){const U=f(V,D);U<0?q=!0:U>0&&(j=!0)}else V!=null?q=!0:j=!0;j?(p(D),D=hr(C)):q?(g(V),V=hr(A)):(V=hr(A),D=hr(C))}})(i,s,Gt,(c=>{o.push(this.jn(e,t,r,c))}),(c=>{o.push(this.Hn(e,t,r,c))})),v.waitFor(o)}Wn(e){let t=1;return pr(e).ee({index:Nm,reverse:!0,range:IDBKeyRange.upperBound([this.uid,Number.MAX_SAFE_INTEGER])},((r,i,s)=>{s.done(),t=i.sequenceNumber+1})).next((()=>t))}createRange(e,t,r){r=r.sort(((o,c)=>Gt(o,c))).filter(((o,c,u)=>!c||Gt(o,u[c-1])!==0));const i=[];i.push(e);for(const o of r){const c=Gt(o,e),u=Gt(o,t);if(c===0)i[0]=e.En();else if(c>0&&u<0)i.push(o),i.push(o.En());else if(u>0)break}i.push(t);const s=[];for(let o=0;o<i.length;o+=2){if(this.Jn(i[o],i[o+1]))return[];const c=i[o].An(this.uid,ro,x.empty()),u=i[o+1].An(this.uid,ro,x.empty());s.push(IDBKeyRange.bound(c,u))}return s}Jn(e,t){return Gt(e,t)>0}getMinOffsetFromCollectionGroup(e,t){return this.getFieldIndexes(e,t).next(Ef)}getMinOffset(e,t){return v.mapArray(this.vn(t),(r=>this.Fn(e,r).next((i=>i||M(44426))))).next(Ef)}}function Tf(n){return we(n,is)}function fr(n){return we(n,qi)}function Si(n){return we(n,$u)}function pr(n){return we(n,$i)}function Ef(n){F(n.length!==0,28825);let e=n[0].indexState.offset,t=e.largestBatchId;for(let r=1;r<n.length;r++){const i=n[r].indexState.offset;Fu(i,e)<0&&(e=i),t<i.largestBatchId&&(t=i.largestBatchId)}return new nt(e.readTime,e.documentKey,t)}/**
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
 */const wf={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0},Bg=41943040;class Ne{static withCacheSize(e){return new Ne(e,Ne.DEFAULT_COLLECTION_PERCENTILE,Ne.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)}constructor(e,t,r){this.cacheSizeCollectionThreshold=e,this.percentileToCollect=t,this.maximumSequenceNumbersToCollect=r}}/**
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
 */function $g(n,e,t){const r=n.store(at),i=n.store(Or),s=[],o=IDBKeyRange.only(t.batchId);let c=0;const u=r.ee({range:o},((f,p,g)=>(c++,g.delete())));s.push(u.next((()=>{F(c===1,47070,{batchId:t.batchId})})));const l=[];for(const f of t.mutations){const p=Cm(e,f.key.path,t.batchId);s.push(i.delete(p)),l.push(f.key)}return v.waitFor(s).next((()=>l))}function qo(n){if(!n)return 0;let e;if(n.document)e=n.document;else if(n.unknownDocument)e=n.unknownDocument;else{if(!n.noDocument)throw M(14731);e=n.noDocument}return JSON.stringify(e).length}/**
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
 */Ne.DEFAULT_COLLECTION_PERCENTILE=10,Ne.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,Ne.DEFAULT=new Ne(Bg,Ne.DEFAULT_COLLECTION_PERCENTILE,Ne.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),Ne.DISABLED=new Ne(-1,0,0);class wa{constructor(e,t,r,i){this.userId=e,this.serializer=t,this.indexManager=r,this.referenceDelegate=i,this.Zn={}}static wt(e,t,r,i){F(e.uid!=="",64387);const s=e.isAuthenticated()?e.uid:"";return new wa(s,t,r,i)}checkEmpty(e){let t=!0;const r=IDBKeyRange.bound([this.userId,Number.NEGATIVE_INFINITY],[this.userId,Number.POSITIVE_INFINITY]);return Kt(e).ee({index:Un,range:r},((i,s,o)=>{t=!1,o.done()})).next((()=>t))}addMutationBatch(e,t,r,i){const s=Tr(e),o=Kt(e);return o.add({}).next((c=>{F(typeof c=="number",49019);const u=new Yu(c,t,r,i),l=(function(A,C,V){const D=V.baseMutations.map((q=>ds(A.yt,q))),j=V.mutations.map((q=>ds(A.yt,q)));return{userId:C,batchId:V.batchId,localWriteTimeMs:V.localWriteTime.toMillis(),baseMutations:D,mutations:j}})(this.serializer,this.userId,u),f=[];let p=new re(((g,A)=>z(g.canonicalString(),A.canonicalString())));for(const g of i){const A=Cm(this.userId,g.key.path,c);p=p.add(g.key.path.popLast()),f.push(o.put(l)),f.push(s.put(A,sw))}return p.forEach((g=>{f.push(this.indexManager.addToCollectionParentIndex(e,g))})),e.addOnCommittedListener((()=>{this.Zn[c]=u.keys()})),v.waitFor(f).next((()=>u))}))}lookupMutationBatch(e,t){return Kt(e).get(t).next((r=>r?(F(r.userId===this.userId,48,"Unexpected user for mutation batch",{userId:r.userId,batchId:t}),Mn(this.serializer,r)):null))}Xn(e,t){return this.Zn[t]?v.resolve(this.Zn[t]):this.lookupMutationBatch(e,t).next((r=>{if(r){const i=r.keys();return this.Zn[t]=i,i}return null}))}getNextMutationBatchAfterBatchId(e,t){const r=t+1,i=IDBKeyRange.lowerBound([this.userId,r]);let s=null;return Kt(e).ee({index:Un,range:i},((o,c,u)=>{c.userId===this.userId&&(F(c.batchId>=r,47524,{Yn:r}),s=Mn(this.serializer,c)),u.done()})).next((()=>s))}getHighestUnacknowledgedBatchId(e){const t=IDBKeyRange.upperBound([this.userId,Number.POSITIVE_INFINITY]);let r=$n;return Kt(e).ee({index:Un,range:t,reverse:!0},((i,s,o)=>{r=s.batchId,o.done()})).next((()=>r))}getAllMutationBatches(e){const t=IDBKeyRange.bound([this.userId,$n],[this.userId,Number.POSITIVE_INFINITY]);return Kt(e).H(Un,t).next((r=>r.map((i=>Mn(this.serializer,i)))))}getAllMutationBatchesAffectingDocumentKey(e,t){const r=mo(this.userId,t.path),i=IDBKeyRange.lowerBound(r),s=[];return Tr(e).ee({range:i},((o,c,u)=>{const[l,f,p]=o,g=yt(f);if(l===this.userId&&t.path.isEqual(g))return Kt(e).get(p).next((A=>{if(!A)throw M(61480,{er:o,batchId:p});F(A.userId===this.userId,10503,"Unexpected user for mutation batch",{userId:A.userId,batchId:p}),s.push(Mn(this.serializer,A))}));u.done()})).next((()=>s))}getAllMutationBatchesAffectingDocumentKeys(e,t){let r=new re(z);const i=[];return t.forEach((s=>{const o=mo(this.userId,s.path),c=IDBKeyRange.lowerBound(o),u=Tr(e).ee({range:c},((l,f,p)=>{const[g,A,C]=l,V=yt(A);g===this.userId&&s.path.isEqual(V)?r=r.add(C):p.done()}));i.push(u)})),v.waitFor(i).next((()=>this.tr(e,r)))}getAllMutationBatchesAffectingQuery(e,t){const r=t.path,i=r.length+1,s=mo(this.userId,r),o=IDBKeyRange.lowerBound(s);let c=new re(z);return Tr(e).ee({range:o},((u,l,f)=>{const[p,g,A]=u,C=yt(g);p===this.userId&&r.isPrefixOf(C)?C.length===i&&(c=c.add(A)):f.done()})).next((()=>this.tr(e,c)))}tr(e,t){const r=[],i=[];return t.forEach((s=>{i.push(Kt(e).get(s).next((o=>{if(o===null)throw M(35274,{batchId:s});F(o.userId===this.userId,9748,"Unexpected user for mutation batch",{userId:o.userId,batchId:s}),r.push(Mn(this.serializer,o))})))})),v.waitFor(i).next((()=>r))}removeMutationBatch(e,t){return $g(e.le,this.userId,t).next((r=>(e.addOnCommittedListener((()=>{this.nr(t.batchId)})),v.forEach(r,(i=>this.referenceDelegate.markPotentiallyOrphaned(e,i))))))}nr(e){delete this.Zn[e]}performConsistencyCheck(e){return this.checkEmpty(e).next((t=>{if(!t)return v.resolve();const r=IDBKeyRange.lowerBound((function(o){return[o]})(this.userId)),i=[];return Tr(e).ee({range:r},((s,o,c)=>{if(s[0]===this.userId){const u=yt(s[1]);i.push(u)}else c.done()})).next((()=>{F(i.length===0,56720,{rr:i.map((s=>s.canonicalString()))})}))}))}containsKey(e,t){return qg(e,this.userId,t)}ir(e){return jg(e).get(this.userId).next((t=>t||{userId:this.userId,lastAcknowledgedBatchId:$n,lastStreamToken:""}))}}function qg(n,e,t){const r=mo(e,t.path),i=r[1],s=IDBKeyRange.lowerBound(r);let o=!1;return Tr(n).ee({range:s,Y:!0},((c,u,l)=>{const[f,p,g]=c;f===e&&p===i&&(o=!0),l.done()})).next((()=>o))}function Kt(n){return we(n,at)}function Tr(n){return we(n,Or)}function jg(n){return we(n,ns)}/**
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
 */class Yn{constructor(e){this.sr=e}next(){return this.sr+=2,this.sr}static _r(){return new Yn(0)}static ar(){return new Yn(-1)}}/**
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
 */class kv{constructor(e,t){this.referenceDelegate=e,this.serializer=t}allocateTargetId(e){return this.ur(e).next((t=>{const r=new Yn(t.highestTargetId);return t.highestTargetId=r.next(),this.cr(e,t).next((()=>t.highestTargetId))}))}getLastRemoteSnapshotVersion(e){return this.ur(e).next((t=>B.fromTimestamp(new te(t.lastRemoteSnapshotVersion.seconds,t.lastRemoteSnapshotVersion.nanoseconds))))}getHighestSequenceNumber(e){return this.ur(e).next((t=>t.highestListenSequenceNumber))}setTargetsMetadata(e,t,r){return this.ur(e).next((i=>(i.highestListenSequenceNumber=t,r&&(i.lastRemoteSnapshotVersion=r.toTimestamp()),t>i.highestListenSequenceNumber&&(i.highestListenSequenceNumber=t),this.cr(e,i))))}addTargetData(e,t){return this.lr(e,t).next((()=>this.ur(e).next((r=>(r.targetCount+=1,this.hr(t,r),this.cr(e,r))))))}updateTargetData(e,t){return this.lr(e,t)}removeTargetData(e,t){return this.removeMatchingKeysForTargetId(e,t.targetId).next((()=>mr(e).delete(t.targetId))).next((()=>this.ur(e))).next((r=>(F(r.targetCount>0,8065),r.targetCount-=1,this.cr(e,r))))}removeTargets(e,t,r){let i=0;const s=[];return mr(e).ee(((o,c)=>{const u=Li(c);u.sequenceNumber<=t&&r.get(u.targetId)===null&&(i++,s.push(this.removeTargetData(e,u)))})).next((()=>v.waitFor(s))).next((()=>i))}forEachTarget(e,t){return mr(e).ee(((r,i)=>{const s=Li(i);t(s)}))}ur(e){return vf(e).get(Mo).next((t=>(F(t!==null,2888),t)))}cr(e,t){return vf(e).put(Mo,t)}lr(e,t){return mr(e).put(Mg(this.serializer,t))}hr(e,t){let r=!1;return e.targetId>t.highestTargetId&&(t.highestTargetId=e.targetId,r=!0),e.sequenceNumber>t.highestListenSequenceNumber&&(t.highestListenSequenceNumber=e.sequenceNumber,r=!0),r}getTargetCount(e){return this.ur(e).next((t=>t.targetCount))}getTargetData(e,t){const r=Wn(t),i=IDBKeyRange.bound([r,Number.NEGATIVE_INFINITY],[r,Number.POSITIVE_INFINITY]);let s=null;return mr(e).ee({range:i,index:Dm},((o,c,u)=>{const l=Li(c);As(t,l.target)&&(s=l,u.done())})).next((()=>s))}addMatchingKeys(e,t,r){const i=[],s=Qt(e);return t.forEach((o=>{const c=Oe(o.path);i.push(s.put({targetId:r,path:c})),i.push(this.referenceDelegate.addReference(e,r,o))})),v.waitFor(i)}removeMatchingKeys(e,t,r){const i=Qt(e);return v.forEach(t,(s=>{const o=Oe(s.path);return v.waitFor([i.delete([r,o]),this.referenceDelegate.removeReference(e,r,s)])}))}removeMatchingKeysForTargetId(e,t){const r=Qt(e),i=IDBKeyRange.bound([t],[t+1],!1,!0);return r.delete(i)}getMatchingKeysForTargetId(e,t){const r=IDBKeyRange.bound([t],[t+1],!1,!0),i=Qt(e);let s=W();return i.ee({range:r,Y:!0},((o,c,u)=>{const l=yt(o[1]),f=new x(l);s=s.add(f)})).next((()=>s))}containsKey(e,t){const r=Oe(t.path),i=IDBKeyRange.bound([r],[Tm(r)],!1,!0);let s=0;return Qt(e).ee({index:Bu,Y:!0,range:i},(([o,c],u,l)=>{o!==0&&(s++,l.done())})).next((()=>s>0))}At(e,t){return mr(e).get(t).next((r=>r?Li(r):null))}}function mr(n){return we(n,xr)}function vf(n){return we(n,qn)}function Qt(n){return we(n,Mr)}/**
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
 */const Af="LruGarbageCollector",zg=1048576;function bf([n,e],[t,r]){const i=z(n,t);return i===0?z(e,r):i}class Dv{constructor(e){this.Pr=e,this.buffer=new re(bf),this.Tr=0}Ir(){return++this.Tr}Er(e){const t=[e,this.Ir()];if(this.buffer.size<this.Pr)this.buffer=this.buffer.add(t);else{const r=this.buffer.last();bf(t,r)<0&&(this.buffer=this.buffer.delete(r).add(t))}}get maxValue(){return this.buffer.last()[0]}}class Gg{constructor(e,t,r){this.garbageCollector=e,this.asyncQueue=t,this.localStore=r,this.Rr=null}start(){this.garbageCollector.params.cacheSizeCollectionThreshold!==-1&&this.Ar(6e4)}stop(){this.Rr&&(this.Rr.cancel(),this.Rr=null)}get started(){return this.Rr!==null}Ar(e){k(Af,`Garbage collection scheduled in ${e}ms`),this.Rr=this.asyncQueue.enqueueAfterDelay("lru_garbage_collection",e,(async()=>{this.Rr=null;try{await this.localStore.collectGarbage(this.garbageCollector)}catch(t){Tn(t)?k(Af,"Ignoring IndexedDB error during garbage collection: ",t):await In(t)}await this.Ar(3e5)}))}}class Nv{constructor(e,t){this.Vr=e,this.params=t}calculateTargetCount(e,t){return this.Vr.dr(e).next((r=>Math.floor(t/100*r)))}nthSequenceNumber(e,t){if(t===0)return v.resolve(je.ce);const r=new Dv(t);return this.Vr.forEachTarget(e,(i=>r.Er(i.sequenceNumber))).next((()=>this.Vr.mr(e,(i=>r.Er(i))))).next((()=>r.maxValue))}removeTargets(e,t,r){return this.Vr.removeTargets(e,t,r)}removeOrphanedDocuments(e,t){return this.Vr.removeOrphanedDocuments(e,t)}collect(e,t){return this.params.cacheSizeCollectionThreshold===-1?(k("LruGarbageCollector","Garbage collection skipped; disabled"),v.resolve(wf)):this.getCacheSize(e).next((r=>r<this.params.cacheSizeCollectionThreshold?(k("LruGarbageCollector",`Garbage collection skipped; Cache size ${r} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`),wf):this.gr(e,t)))}getCacheSize(e){return this.Vr.getCacheSize(e)}gr(e,t){let r,i,s,o,c,u,l;const f=Date.now();return this.calculateTargetCount(e,this.params.percentileToCollect).next((p=>(p>this.params.maximumSequenceNumbersToCollect?(k("LruGarbageCollector",`Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${p}`),i=this.params.maximumSequenceNumbersToCollect):i=p,o=Date.now(),this.nthSequenceNumber(e,i)))).next((p=>(r=p,c=Date.now(),this.removeTargets(e,r,t)))).next((p=>(s=p,u=Date.now(),this.removeOrphanedDocuments(e,r)))).next((p=>(l=Date.now(),gr()<=J.DEBUG&&k("LruGarbageCollector",`LRU Garbage Collection
	Counted targets in ${o-f}ms
	Determined least recently used ${i} in `+(c-o)+`ms
	Removed ${s} targets in `+(u-c)+`ms
	Removed ${p} documents in `+(l-u)+`ms
Total Duration: ${l-f}ms`),v.resolve({didRun:!0,sequenceNumbersCollected:i,targetsRemoved:s,documentsRemoved:p}))))}}function Kg(n,e){return new Nv(n,e)}/**
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
 */class Vv{constructor(e,t){this.db=e,this.garbageCollector=Kg(this,t)}dr(e){const t=this.pr(e);return this.db.getTargetCache().getTargetCount(e).next((r=>t.next((i=>r+i))))}pr(e){let t=0;return this.mr(e,(r=>{t++})).next((()=>t))}forEachTarget(e,t){return this.db.getTargetCache().forEachTarget(e,t)}mr(e,t){return this.yr(e,((r,i)=>t(i)))}addReference(e,t,r){return io(e,r)}removeReference(e,t,r){return io(e,r)}removeTargets(e,t,r){return this.db.getTargetCache().removeTargets(e,t,r)}markPotentiallyOrphaned(e,t){return io(e,t)}wr(e,t){return(function(i,s){let o=!1;return jg(i).te((c=>qg(i,c,s).next((u=>(u&&(o=!0),v.resolve(!u)))))).next((()=>o))})(e,t)}removeOrphanedDocuments(e,t){const r=this.db.getRemoteDocumentCache().newChangeBuffer(),i=[];let s=0;return this.yr(e,((o,c)=>{if(c<=t){const u=this.wr(e,o).next((l=>{if(!l)return s++,r.getEntry(e,o).next((()=>(r.removeEntry(o,B.min()),Qt(e).delete((function(p){return[0,Oe(p.path)]})(o)))))}));i.push(u)}})).next((()=>v.waitFor(i))).next((()=>r.apply(e))).next((()=>s))}removeTarget(e,t){const r=t.withSequenceNumber(e.currentSequenceNumber);return this.db.getTargetCache().updateTargetData(e,r)}updateLimboDocument(e,t){return io(e,t)}yr(e,t){const r=Qt(e);let i,s=je.ce;return r.ee({index:Bu},(([o,c],{path:u,sequenceNumber:l})=>{o===0?(s!==je.ce&&t(new x(yt(i)),s),s=l,i=u):s=je.ce})).next((()=>{s!==je.ce&&t(new x(yt(i)),s)}))}getCacheSize(e){return this.db.getRemoteDocumentCache().getSize(e)}}function io(n,e){return Qt(n).put((function(r,i){return{targetId:0,path:Oe(r.path),sequenceNumber:i}})(e,n.currentSequenceNumber))}/**
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
 */class Hg{constructor(){this.changes=new Lt((e=>e.toString()),((e,t)=>e.isEqual(t))),this.changesApplied=!1}addEntry(e){this.assertNotApplied(),this.changes.set(e.key,e)}removeEntry(e,t){this.assertNotApplied(),this.changes.set(e,ce.newInvalidDocument(e).setReadTime(t))}getEntry(e,t){this.assertNotApplied();const r=this.changes.get(t);return r!==void 0?v.resolve(r):this.getFromCache(e,t)}getEntries(e,t){return this.getAllFromCache(e,t)}apply(e){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(e)}assertNotApplied(){}}/**
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
 */class Ov{constructor(e){this.serializer=e}setIndexManager(e){this.indexManager=e}addEntry(e,t,r){return Dn(e).put(r)}removeEntry(e,t,r){return Dn(e).delete((function(s,o){const c=s.path.toArray();return[c.slice(0,c.length-2),c[c.length-2],Bo(o),c[c.length-1]]})(t,r))}updateMetadata(e,t){return this.getMetadata(e).next((r=>(r.byteSize+=t,this.br(e,r))))}getEntry(e,t){let r=ce.newInvalidDocument(t);return Dn(e).ee({index:go,range:IDBKeyRange.only(Pi(t))},((i,s)=>{r=this.Sr(t,s)})).next((()=>r))}Dr(e,t){let r={size:0,document:ce.newInvalidDocument(t)};return Dn(e).ee({index:go,range:IDBKeyRange.only(Pi(t))},((i,s)=>{r={document:this.Sr(t,s),size:qo(s)}})).next((()=>r))}getEntries(e,t){let r=Ye();return this.Cr(e,t,((i,s)=>{const o=this.Sr(i,s);r=r.insert(i,o)})).next((()=>r))}vr(e,t){let r=Ye(),i=new se(x.comparator);return this.Cr(e,t,((s,o)=>{const c=this.Sr(s,o);r=r.insert(s,c),i=i.insert(s,qo(o))})).next((()=>({documents:r,Fr:i})))}Cr(e,t,r){if(t.isEmpty())return v.resolve();let i=new re(Pf);t.forEach((u=>i=i.add(u)));const s=IDBKeyRange.bound(Pi(i.first()),Pi(i.last())),o=i.getIterator();let c=o.getNext();return Dn(e).ee({index:go,range:s},((u,l,f)=>{const p=x.fromSegments([...l.prefixPath,l.collectionGroup,l.documentId]);for(;c&&Pf(c,p)<0;)r(c,null),c=o.getNext();c&&c.isEqual(p)&&(r(c,l),c=o.hasNext()?o.getNext():null),c?f.j(Pi(c)):f.done()})).next((()=>{for(;c;)r(c,null),c=o.hasNext()?o.getNext():null}))}getDocumentsMatchingQuery(e,t,r,i,s){const o=t.path,c=[o.popLast().toArray(),o.lastSegment(),Bo(r.readTime),r.documentKey.path.isEmpty()?"":r.documentKey.path.lastSegment()],u=[o.popLast().toArray(),o.lastSegment(),[Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER],""];return Dn(e).H(IDBKeyRange.bound(c,u,!0)).next((l=>{s?.incrementDocumentReadCount(l.length);let f=Ye();for(const p of l){const g=this.Sr(x.fromSegments(p.prefixPath.concat(p.collectionGroup,p.documentId)),p);g.isFoundDocument()&&(Rs(t,g)||i.has(g.key))&&(f=f.insert(g.key,g))}return f}))}getAllFromCollectionGroup(e,t,r,i){let s=Ye();const o=Sf(t,r),c=Sf(t,nt.max());return Dn(e).ee({index:km,range:IDBKeyRange.bound(o,c,!0)},((u,l,f)=>{const p=this.Sr(x.fromSegments(l.prefixPath.concat(l.collectionGroup,l.documentId)),l);s=s.insert(p.key,p),s.size===i&&f.done()})).next((()=>s))}newChangeBuffer(e){return new xv(this,!!e&&e.trackRemovals)}getSize(e){return this.getMetadata(e).next((t=>t.byteSize))}getMetadata(e){return Rf(e).get(Wc).next((t=>(F(!!t,20021),t)))}br(e,t){return Rf(e).put(Wc,t)}Sr(e,t){if(t){const r=Tv(this.serializer,t);if(!(r.isNoDocument()&&r.version.isEqual(B.min())))return r}return ce.newInvalidDocument(e)}}function Wg(n){return new Ov(n)}class xv extends Hg{constructor(e,t){super(),this.Mr=e,this.trackRemovals=t,this.Or=new Lt((r=>r.toString()),((r,i)=>r.isEqual(i)))}applyChanges(e){const t=[];let r=0,i=new re(((s,o)=>z(s.canonicalString(),o.canonicalString())));return this.changes.forEach(((s,o)=>{const c=this.Or.get(s);if(t.push(this.Mr.removeEntry(e,s,c.readTime)),o.isValidDocument()){const u=uf(this.Mr.serializer,o);i=i.add(s.path.popLast());const l=qo(u);r+=l-c.size,t.push(this.Mr.addEntry(e,s,u))}else if(r-=c.size,this.trackRemovals){const u=uf(this.Mr.serializer,o.convertToNoDocument(B.min()));t.push(this.Mr.addEntry(e,s,u))}})),i.forEach((s=>{t.push(this.Mr.indexManager.addToCollectionParentIndex(e,s))})),t.push(this.Mr.updateMetadata(e,r)),v.waitFor(t)}getFromCache(e,t){return this.Mr.Dr(e,t).next((r=>(this.Or.set(t,{size:r.size,readTime:r.document.readTime}),r.document)))}getAllFromCache(e,t){return this.Mr.vr(e,t).next((({documents:r,Fr:i})=>(i.forEach(((s,o)=>{this.Or.set(s,{size:o,readTime:r.get(s).readTime})})),r)))}}function Rf(n){return we(n,rs)}function Dn(n){return we(n,xo)}function Pi(n){const e=n.path.toArray();return[e.slice(0,e.length-2),e[e.length-2],e[e.length-1]]}function Sf(n,e){const t=e.documentKey.path.toArray();return[n,Bo(e.readTime),t.slice(0,t.length-2),t.length>0?t[t.length-1]:""]}function Pf(n,e){const t=n.path.toArray(),r=e.path.toArray();let i=0;for(let s=0;s<t.length-2&&s<r.length-2;++s)if(i=z(t[s],r[s]),i)return i;return i=z(t.length,r.length),i||(i=z(t[t.length-2],r[r.length-2]),i||z(t[t.length-1],r[r.length-1]))}/**
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
 */class Mv{constructor(e,t){this.overlayedDocument=e,this.mutatedFields=t}}/**
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
 */class Qg{constructor(e,t,r,i){this.remoteDocumentCache=e,this.mutationQueue=t,this.documentOverlayCache=r,this.indexManager=i}getDocument(e,t){let r=null;return this.documentOverlayCache.getOverlay(e,t).next((i=>(r=i,this.remoteDocumentCache.getEntry(e,t)))).next((i=>(r!==null&&Ki(r.mutation,i,ze.empty(),te.now()),i)))}getDocuments(e,t){return this.remoteDocumentCache.getEntries(e,t).next((r=>this.getLocalViewOfDocuments(e,r,W()).next((()=>r))))}getLocalViewOfDocuments(e,t,r=W()){const i=It();return this.populateOverlays(e,i,t).next((()=>this.computeViews(e,t,i,r).next((s=>{let o=xi();return s.forEach(((c,u)=>{o=o.insert(c,u.overlayedDocument)})),o}))))}getOverlayedDocuments(e,t){const r=It();return this.populateOverlays(e,r,t).next((()=>this.computeViews(e,t,r,W())))}populateOverlays(e,t,r){const i=[];return r.forEach((s=>{t.has(s)||i.push(s)})),this.documentOverlayCache.getOverlays(e,i).next((s=>{s.forEach(((o,c)=>{t.set(o,c)}))}))}computeViews(e,t,r,i){let s=Ye();const o=Gi(),c=(function(){return Gi()})();return t.forEach(((u,l)=>{const f=r.get(l.key);i.has(l.key)&&(f===void 0||f.mutation instanceof Ft)?s=s.insert(l.key,l):f!==void 0?(o.set(l.key,f.mutation.getFieldMask()),Ki(f.mutation,l,f.mutation.getFieldMask(),te.now())):o.set(l.key,ze.empty())})),this.recalculateAndSaveOverlays(e,s).next((u=>(u.forEach(((l,f)=>o.set(l,f))),t.forEach(((l,f)=>c.set(l,new Mv(f,o.get(l)??null)))),c)))}recalculateAndSaveOverlays(e,t){const r=Gi();let i=new se(((o,c)=>o-c)),s=W();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e,t).next((o=>{for(const c of o)c.keys().forEach((u=>{const l=t.get(u);if(l===null)return;let f=r.get(u)||ze.empty();f=c.applyToLocalView(l,f),r.set(u,f);const p=(i.get(c.batchId)||W()).add(u);i=i.insert(c.batchId,p)}))})).next((()=>{const o=[],c=i.getReverseIterator();for(;c.hasNext();){const u=c.getNext(),l=u.key,f=u.value,p=ug();f.forEach((g=>{if(!s.has(g)){const A=_g(t.get(g),r.get(g));A!==null&&p.set(g,A),s=s.add(g)}})),o.push(this.documentOverlayCache.saveOverlays(e,l,p))}return v.waitFor(o)})).next((()=>r))}recalculateAndSaveOverlaysForDocumentKeys(e,t){return this.remoteDocumentCache.getEntries(e,t).next((r=>this.recalculateAndSaveOverlays(e,r)))}getDocumentsMatchingQuery(e,t,r,i){return qw(t)?this.getDocumentsMatchingDocumentQuery(e,t.path):rg(t)?this.getDocumentsMatchingCollectionGroupQuery(e,t,r,i):this.getDocumentsMatchingCollectionQuery(e,t,r,i)}getNextDocuments(e,t,r,i){return this.remoteDocumentCache.getAllFromCollectionGroup(e,t,r,i).next((s=>{const o=i-s.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(e,t,r.largestBatchId,i-s.size):v.resolve(It());let c=Vr,u=s;return o.next((l=>v.forEach(l,((f,p)=>(c<p.largestBatchId&&(c=p.largestBatchId),s.get(f)?v.resolve():this.remoteDocumentCache.getEntry(e,f).next((g=>{u=u.insert(f,g)}))))).next((()=>this.populateOverlays(e,l,s))).next((()=>this.computeViews(e,u,l,W()))).next((f=>({batchId:c,changes:cg(f)})))))}))}getDocumentsMatchingDocumentQuery(e,t){return this.getDocument(e,new x(t)).next((r=>{let i=xi();return r.isFoundDocument()&&(i=i.insert(r.key,r)),i}))}getDocumentsMatchingCollectionGroupQuery(e,t,r,i){const s=t.collectionGroup;let o=xi();return this.indexManager.getCollectionParents(e,s).next((c=>v.forEach(c,(u=>{const l=(function(p,g){return new Zr(g,null,p.explicitOrderBy.slice(),p.filters.slice(),p.limit,p.limitType,p.startAt,p.endAt)})(t,u.child(s));return this.getDocumentsMatchingCollectionQuery(e,l,r,i).next((f=>{f.forEach(((p,g)=>{o=o.insert(p,g)}))}))})).next((()=>o))))}getDocumentsMatchingCollectionQuery(e,t,r,i){let s;return this.documentOverlayCache.getOverlaysForCollection(e,t.path,r.largestBatchId).next((o=>(s=o,this.remoteDocumentCache.getDocumentsMatchingQuery(e,t,r,s,i)))).next((o=>{s.forEach(((u,l)=>{const f=l.getKey();o.get(f)===null&&(o=o.insert(f,ce.newInvalidDocument(f)))}));let c=xi();return o.forEach(((u,l)=>{const f=s.get(u);f!==void 0&&Ki(f.mutation,l,ze.empty(),te.now()),Rs(t,l)&&(c=c.insert(u,l))})),c}))}}/**
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
 */class Lv{constructor(e){this.serializer=e,this.Nr=new Map,this.Br=new Map}getBundleMetadata(e,t){return v.resolve(this.Nr.get(t))}saveBundleMetadata(e,t){return this.Nr.set(t.id,(function(i){return{id:i.id,version:i.version,createTime:Re(i.createTime)}})(t)),v.resolve()}getNamedQuery(e,t){return v.resolve(this.Br.get(t))}saveNamedQuery(e,t){return this.Br.set(t.name,(function(i){return{name:i.name,query:Lg(i.bundledQuery),readTime:Re(i.readTime)}})(t)),v.resolve()}}/**
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
 */class Fv{constructor(){this.overlays=new se(x.comparator),this.Lr=new Map}getOverlay(e,t){return v.resolve(this.overlays.get(t))}getOverlays(e,t){const r=It();return v.forEach(t,(i=>this.getOverlay(e,i).next((s=>{s!==null&&r.set(i,s)})))).next((()=>r))}saveOverlays(e,t,r){return r.forEach(((i,s)=>{this.bt(e,t,s)})),v.resolve()}removeOverlaysForBatchId(e,t,r){const i=this.Lr.get(r);return i!==void 0&&(i.forEach((s=>this.overlays=this.overlays.remove(s))),this.Lr.delete(r)),v.resolve()}getOverlaysForCollection(e,t,r){const i=It(),s=t.length+1,o=new x(t.child("")),c=this.overlays.getIteratorFrom(o);for(;c.hasNext();){const u=c.getNext().value,l=u.getKey();if(!t.isPrefixOf(l.path))break;l.path.length===s&&u.largestBatchId>r&&i.set(u.getKey(),u)}return v.resolve(i)}getOverlaysForCollectionGroup(e,t,r,i){let s=new se(((l,f)=>l-f));const o=this.overlays.getIterator();for(;o.hasNext();){const l=o.getNext().value;if(l.getKey().getCollectionGroup()===t&&l.largestBatchId>r){let f=s.get(l.largestBatchId);f===null&&(f=It(),s=s.insert(l.largestBatchId,f)),f.set(l.getKey(),l)}}const c=It(),u=s.getIterator();for(;u.hasNext()&&(u.getNext().value.forEach(((l,f)=>c.set(l,f))),!(c.size()>=i)););return v.resolve(c)}bt(e,t,r){const i=this.overlays.get(r.key);if(i!==null){const o=this.Lr.get(i.largestBatchId).delete(r.key);this.Lr.set(i.largestBatchId,o)}this.overlays=this.overlays.insert(r.key,new Zu(t,r));let s=this.Lr.get(t);s===void 0&&(s=W(),this.Lr.set(t,s)),this.Lr.set(t,s.add(r.key))}}/**
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
 */class Uv{constructor(){this.sessionToken=ge.EMPTY_BYTE_STRING}getSessionToken(e){return v.resolve(this.sessionToken)}setSessionToken(e,t){return this.sessionToken=t,v.resolve()}}/**
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
 */class il{constructor(){this.kr=new re(Ae.Kr),this.qr=new re(Ae.Ur)}isEmpty(){return this.kr.isEmpty()}addReference(e,t){const r=new Ae(e,t);this.kr=this.kr.add(r),this.qr=this.qr.add(r)}$r(e,t){e.forEach((r=>this.addReference(r,t)))}removeReference(e,t){this.Wr(new Ae(e,t))}Qr(e,t){e.forEach((r=>this.removeReference(r,t)))}Gr(e){const t=new x(new ee([])),r=new Ae(t,e),i=new Ae(t,e+1),s=[];return this.qr.forEachInRange([r,i],(o=>{this.Wr(o),s.push(o.key)})),s}zr(){this.kr.forEach((e=>this.Wr(e)))}Wr(e){this.kr=this.kr.delete(e),this.qr=this.qr.delete(e)}jr(e){const t=new x(new ee([])),r=new Ae(t,e),i=new Ae(t,e+1);let s=W();return this.qr.forEachInRange([r,i],(o=>{s=s.add(o.key)})),s}containsKey(e){const t=new Ae(e,0),r=this.kr.firstAfterOrEqual(t);return r!==null&&e.isEqual(r.key)}}class Ae{constructor(e,t){this.key=e,this.Hr=t}static Kr(e,t){return x.comparator(e.key,t.key)||z(e.Hr,t.Hr)}static Ur(e,t){return z(e.Hr,t.Hr)||x.comparator(e.key,t.key)}}/**
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
 */class Bv{constructor(e,t){this.indexManager=e,this.referenceDelegate=t,this.mutationQueue=[],this.Yn=1,this.Jr=new re(Ae.Kr)}checkEmpty(e){return v.resolve(this.mutationQueue.length===0)}addMutationBatch(e,t,r,i){const s=this.Yn;this.Yn++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const o=new Yu(s,t,r,i);this.mutationQueue.push(o);for(const c of i)this.Jr=this.Jr.add(new Ae(c.key,s)),this.indexManager.addToCollectionParentIndex(e,c.key.path.popLast());return v.resolve(o)}lookupMutationBatch(e,t){return v.resolve(this.Zr(t))}getNextMutationBatchAfterBatchId(e,t){const r=t+1,i=this.Xr(r),s=i<0?0:i;return v.resolve(this.mutationQueue.length>s?this.mutationQueue[s]:null)}getHighestUnacknowledgedBatchId(){return v.resolve(this.mutationQueue.length===0?$n:this.Yn-1)}getAllMutationBatches(e){return v.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(e,t){const r=new Ae(t,0),i=new Ae(t,Number.POSITIVE_INFINITY),s=[];return this.Jr.forEachInRange([r,i],(o=>{const c=this.Zr(o.Hr);s.push(c)})),v.resolve(s)}getAllMutationBatchesAffectingDocumentKeys(e,t){let r=new re(z);return t.forEach((i=>{const s=new Ae(i,0),o=new Ae(i,Number.POSITIVE_INFINITY);this.Jr.forEachInRange([s,o],(c=>{r=r.add(c.Hr)}))})),v.resolve(this.Yr(r))}getAllMutationBatchesAffectingQuery(e,t){const r=t.path,i=r.length+1;let s=r;x.isDocumentKey(s)||(s=s.child(""));const o=new Ae(new x(s),0);let c=new re(z);return this.Jr.forEachWhile((u=>{const l=u.key.path;return!!r.isPrefixOf(l)&&(l.length===i&&(c=c.add(u.Hr)),!0)}),o),v.resolve(this.Yr(c))}Yr(e){const t=[];return e.forEach((r=>{const i=this.Zr(r);i!==null&&t.push(i)})),t}removeMutationBatch(e,t){F(this.ei(t.batchId,"removed")===0,55003),this.mutationQueue.shift();let r=this.Jr;return v.forEach(t.mutations,(i=>{const s=new Ae(i.key,t.batchId);return r=r.delete(s),this.referenceDelegate.markPotentiallyOrphaned(e,i.key)})).next((()=>{this.Jr=r}))}nr(e){}containsKey(e,t){const r=new Ae(t,0),i=this.Jr.firstAfterOrEqual(r);return v.resolve(t.isEqual(i&&i.key))}performConsistencyCheck(e){return this.mutationQueue.length,v.resolve()}ei(e,t){return this.Xr(e)}Xr(e){return this.mutationQueue.length===0?0:e-this.mutationQueue[0].batchId}Zr(e){const t=this.Xr(e);return t<0||t>=this.mutationQueue.length?null:this.mutationQueue[t]}}/**
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
 */class $v{constructor(e){this.ti=e,this.docs=(function(){return new se(x.comparator)})(),this.size=0}setIndexManager(e){this.indexManager=e}addEntry(e,t){const r=t.key,i=this.docs.get(r),s=i?i.size:0,o=this.ti(t);return this.docs=this.docs.insert(r,{document:t.mutableCopy(),size:o}),this.size+=o-s,this.indexManager.addToCollectionParentIndex(e,r.path.popLast())}removeEntry(e){const t=this.docs.get(e);t&&(this.docs=this.docs.remove(e),this.size-=t.size)}getEntry(e,t){const r=this.docs.get(t);return v.resolve(r?r.document.mutableCopy():ce.newInvalidDocument(t))}getEntries(e,t){let r=Ye();return t.forEach((i=>{const s=this.docs.get(i);r=r.insert(i,s?s.document.mutableCopy():ce.newInvalidDocument(i))})),v.resolve(r)}getDocumentsMatchingQuery(e,t,r,i){let s=Ye();const o=t.path,c=new x(o.child("__id-9223372036854775808__")),u=this.docs.getIteratorFrom(c);for(;u.hasNext();){const{key:l,value:{document:f}}=u.getNext();if(!o.isPrefixOf(l.path))break;l.path.length>o.length+1||Fu(Am(f),r)<=0||(i.has(f.key)||Rs(t,f))&&(s=s.insert(f.key,f.mutableCopy()))}return v.resolve(s)}getAllFromCollectionGroup(e,t,r,i){M(9500)}ni(e,t){return v.forEach(this.docs,(r=>t(r)))}newChangeBuffer(e){return new qv(this)}getSize(e){return v.resolve(this.size)}}class qv extends Hg{constructor(e){super(),this.Mr=e}applyChanges(e){const t=[];return this.changes.forEach(((r,i)=>{i.isValidDocument()?t.push(this.Mr.addEntry(e,i)):this.Mr.removeEntry(r)})),v.waitFor(t)}getFromCache(e,t){return this.Mr.getEntry(e,t)}getAllFromCache(e,t){return this.Mr.getEntries(e,t)}}/**
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
 */class jv{constructor(e){this.persistence=e,this.ri=new Lt((t=>Wn(t)),As),this.lastRemoteSnapshotVersion=B.min(),this.highestTargetId=0,this.ii=0,this.si=new il,this.targetCount=0,this.oi=Yn._r()}forEachTarget(e,t){return this.ri.forEach(((r,i)=>t(i))),v.resolve()}getLastRemoteSnapshotVersion(e){return v.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(e){return v.resolve(this.ii)}allocateTargetId(e){return this.highestTargetId=this.oi.next(),v.resolve(this.highestTargetId)}setTargetsMetadata(e,t,r){return r&&(this.lastRemoteSnapshotVersion=r),t>this.ii&&(this.ii=t),v.resolve()}lr(e){this.ri.set(e.target,e);const t=e.targetId;t>this.highestTargetId&&(this.oi=new Yn(t),this.highestTargetId=t),e.sequenceNumber>this.ii&&(this.ii=e.sequenceNumber)}addTargetData(e,t){return this.lr(t),this.targetCount+=1,v.resolve()}updateTargetData(e,t){return this.lr(t),v.resolve()}removeTargetData(e,t){return this.ri.delete(t.target),this.si.Gr(t.targetId),this.targetCount-=1,v.resolve()}removeTargets(e,t,r){let i=0;const s=[];return this.ri.forEach(((o,c)=>{c.sequenceNumber<=t&&r.get(c.targetId)===null&&(this.ri.delete(o),s.push(this.removeMatchingKeysForTargetId(e,c.targetId)),i++)})),v.waitFor(s).next((()=>i))}getTargetCount(e){return v.resolve(this.targetCount)}getTargetData(e,t){const r=this.ri.get(t)||null;return v.resolve(r)}addMatchingKeys(e,t,r){return this.si.$r(t,r),v.resolve()}removeMatchingKeys(e,t,r){this.si.Qr(t,r);const i=this.persistence.referenceDelegate,s=[];return i&&t.forEach((o=>{s.push(i.markPotentiallyOrphaned(e,o))})),v.waitFor(s)}removeMatchingKeysForTargetId(e,t){return this.si.Gr(t),v.resolve()}getMatchingKeysForTargetId(e,t){const r=this.si.jr(t);return v.resolve(r)}containsKey(e,t){return v.resolve(this.si.containsKey(t))}}/**
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
 */class sl{constructor(e,t){this._i={},this.overlays={},this.ai=new je(0),this.ui=!1,this.ui=!0,this.ci=new Uv,this.referenceDelegate=e(this),this.li=new jv(this),this.indexManager=new Pv,this.remoteDocumentCache=(function(i){return new $v(i)})((r=>this.referenceDelegate.hi(r))),this.serializer=new xg(t),this.Pi=new Lv(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.ui=!1,Promise.resolve()}get started(){return this.ui}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(e){return this.indexManager}getDocumentOverlayCache(e){let t=this.overlays[e.toKey()];return t||(t=new Fv,this.overlays[e.toKey()]=t),t}getMutationQueue(e,t){let r=this._i[e.toKey()];return r||(r=new Bv(t,this.referenceDelegate),this._i[e.toKey()]=r),r}getGlobalsCache(){return this.ci}getTargetCache(){return this.li}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.Pi}runTransaction(e,t,r){k("MemoryPersistence","Starting transaction:",e);const i=new zv(this.ai.next());return this.referenceDelegate.Ti(),r(i).next((s=>this.referenceDelegate.Ii(i).next((()=>s)))).toPromise().then((s=>(i.raiseOnCommittedEvent(),s)))}Ei(e,t){return v.or(Object.values(this._i).map((r=>()=>r.containsKey(e,t))))}}class zv extends Rm{constructor(e){super(),this.currentSequenceNumber=e}}class va{constructor(e){this.persistence=e,this.Ri=new il,this.Ai=null}static Vi(e){return new va(e)}get di(){if(this.Ai)return this.Ai;throw M(60996)}addReference(e,t,r){return this.Ri.addReference(r,t),this.di.delete(r.toString()),v.resolve()}removeReference(e,t,r){return this.Ri.removeReference(r,t),this.di.add(r.toString()),v.resolve()}markPotentiallyOrphaned(e,t){return this.di.add(t.toString()),v.resolve()}removeTarget(e,t){this.Ri.Gr(t.targetId).forEach((i=>this.di.add(i.toString())));const r=this.persistence.getTargetCache();return r.getMatchingKeysForTargetId(e,t.targetId).next((i=>{i.forEach((s=>this.di.add(s.toString())))})).next((()=>r.removeTargetData(e,t)))}Ti(){this.Ai=new Set}Ii(e){const t=this.persistence.getRemoteDocumentCache().newChangeBuffer();return v.forEach(this.di,(r=>{const i=x.fromPath(r);return this.mi(e,i).next((s=>{s||t.removeEntry(i,B.min())}))})).next((()=>(this.Ai=null,t.apply(e))))}updateLimboDocument(e,t){return this.mi(e,t).next((r=>{r?this.di.delete(t.toString()):this.di.add(t.toString())}))}hi(e){return 0}mi(e,t){return v.or([()=>v.resolve(this.Ri.containsKey(t)),()=>this.persistence.getTargetCache().containsKey(e,t),()=>this.persistence.Ei(e,t)])}}class jo{constructor(e,t){this.persistence=e,this.fi=new Lt((r=>Oe(r.path)),((r,i)=>r.isEqual(i))),this.garbageCollector=Kg(this,t)}static Vi(e,t){return new jo(e,t)}Ti(){}Ii(e){return v.resolve()}forEachTarget(e,t){return this.persistence.getTargetCache().forEachTarget(e,t)}dr(e){const t=this.pr(e);return this.persistence.getTargetCache().getTargetCount(e).next((r=>t.next((i=>r+i))))}pr(e){let t=0;return this.mr(e,(r=>{t++})).next((()=>t))}mr(e,t){return v.forEach(this.fi,((r,i)=>this.wr(e,r,i).next((s=>s?v.resolve():t(i)))))}removeTargets(e,t,r){return this.persistence.getTargetCache().removeTargets(e,t,r)}removeOrphanedDocuments(e,t){let r=0;const i=this.persistence.getRemoteDocumentCache(),s=i.newChangeBuffer();return i.ni(e,(o=>this.wr(e,o,t).next((c=>{c||(r++,s.removeEntry(o,B.min()))})))).next((()=>s.apply(e))).next((()=>r))}markPotentiallyOrphaned(e,t){return this.fi.set(t,e.currentSequenceNumber),v.resolve()}removeTarget(e,t){const r=t.withSequenceNumber(e.currentSequenceNumber);return this.persistence.getTargetCache().updateTargetData(e,r)}addReference(e,t,r){return this.fi.set(r,e.currentSequenceNumber),v.resolve()}removeReference(e,t,r){return this.fi.set(r,e.currentSequenceNumber),v.resolve()}updateLimboDocument(e,t){return this.fi.set(t,e.currentSequenceNumber),v.resolve()}hi(e){let t=e.key.toString().length;return e.isFoundDocument()&&(t+=yo(e.data.value)),t}wr(e,t,r){return v.or([()=>this.persistence.Ei(e,t),()=>this.persistence.getTargetCache().containsKey(e,t),()=>{const i=this.fi.get(t);return v.resolve(i!==void 0&&i>r)}])}getCacheSize(e){return this.persistence.getRemoteDocumentCache().getSize(e)}}/**
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
 */class Gv{constructor(e){this.serializer=e}k(e,t,r,i){const s=new da("createOrUpgrade",t);r<1&&i>=1&&((function(u){u.createObjectStore(vs)})(e),(function(u){u.createObjectStore(ns,{keyPath:iw}),u.createObjectStore(at,{keyPath:Fd,autoIncrement:!0}).createIndex(Un,Ud,{unique:!0}),u.createObjectStore(Or)})(e),Cf(e),(function(u){u.createObjectStore(On)})(e));let o=v.resolve();return r<3&&i>=3&&(r!==0&&((function(u){u.deleteObjectStore(Mr),u.deleteObjectStore(xr),u.deleteObjectStore(qn)})(e),Cf(e)),o=o.next((()=>(function(u){const l=u.store(qn),f={highestTargetId:0,highestListenSequenceNumber:0,lastRemoteSnapshotVersion:B.min().toTimestamp(),targetCount:0};return l.put(Mo,f)})(s)))),r<4&&i>=4&&(r!==0&&(o=o.next((()=>(function(u,l){return l.store(at).H().next((p=>{u.deleteObjectStore(at),u.createObjectStore(at,{keyPath:Fd,autoIncrement:!0}).createIndex(Un,Ud,{unique:!0});const g=l.store(at),A=p.map((C=>g.put(C)));return v.waitFor(A)}))})(e,s)))),o=o.next((()=>{(function(u){u.createObjectStore(Lr,{keyPath:fw})})(e)}))),r<5&&i>=5&&(o=o.next((()=>this.gi(s)))),r<6&&i>=6&&(o=o.next((()=>((function(u){u.createObjectStore(rs)})(e),this.pi(s))))),r<7&&i>=7&&(o=o.next((()=>this.yi(s)))),r<8&&i>=8&&(o=o.next((()=>this.wi(e,s)))),r<9&&i>=9&&(o=o.next((()=>{(function(u){u.objectStoreNames.contains("remoteDocumentChanges")&&u.deleteObjectStore("remoteDocumentChanges")})(e)}))),r<10&&i>=10&&(o=o.next((()=>this.bi(s)))),r<11&&i>=11&&(o=o.next((()=>{(function(u){u.createObjectStore(fa,{keyPath:pw})})(e),(function(u){u.createObjectStore(pa,{keyPath:mw})})(e)}))),r<12&&i>=12&&(o=o.next((()=>{(function(u){const l=u.createObjectStore(ma,{keyPath:ww});l.createIndex(Jc,vw,{unique:!1}),l.createIndex(Om,Aw,{unique:!1})})(e)}))),r<13&&i>=13&&(o=o.next((()=>(function(u){const l=u.createObjectStore(xo,{keyPath:ow});l.createIndex(go,aw),l.createIndex(km,cw)})(e))).next((()=>this.Si(e,s))).next((()=>e.deleteObjectStore(On)))),r<14&&i>=14&&(o=o.next((()=>this.Di(e,s)))),r<15&&i>=15&&(o=o.next((()=>(function(u){u.createObjectStore($u,{keyPath:gw,autoIncrement:!0}).createIndex(Qc,_w,{unique:!1}),u.createObjectStore($i,{keyPath:yw}).createIndex(Nm,Iw,{unique:!1}),u.createObjectStore(qi,{keyPath:Tw}).createIndex(Vm,Ew,{unique:!1})})(e)))),r<16&&i>=16&&(o=o.next((()=>{t.objectStore($i).clear()})).next((()=>{t.objectStore(qi).clear()}))),r<17&&i>=17&&(o=o.next((()=>{(function(u){u.createObjectStore(qu,{keyPath:bw})})(e)}))),r<18&&i>=18&&am()&&(o=o.next((()=>{t.objectStore($i).clear()})).next((()=>{t.objectStore(qi).clear()}))),o}pi(e){let t=0;return e.store(On).ee(((r,i)=>{t+=qo(i)})).next((()=>{const r={byteSize:t};return e.store(rs).put(Wc,r)}))}gi(e){const t=e.store(ns),r=e.store(at);return t.H().next((i=>v.forEach(i,(s=>{const o=IDBKeyRange.bound([s.userId,$n],[s.userId,s.lastAcknowledgedBatchId]);return r.H(Un,o).next((c=>v.forEach(c,(u=>{F(u.userId===s.userId,18650,"Cannot process batch from unexpected user",{batchId:u.batchId});const l=Mn(this.serializer,u);return $g(e,s.userId,l).next((()=>{}))}))))}))))}yi(e){const t=e.store(Mr),r=e.store(On);return e.store(qn).get(Mo).next((i=>{const s=[];return r.ee(((o,c)=>{const u=new ee(o),l=(function(p){return[0,Oe(p)]})(u);s.push(t.get(l).next((f=>f?v.resolve():(p=>t.put({targetId:0,path:Oe(p),sequenceNumber:i.highestListenSequenceNumber}))(u))))})).next((()=>v.waitFor(s)))}))}wi(e,t){e.createObjectStore(is,{keyPath:dw});const r=t.store(is),i=new rl,s=o=>{if(i.add(o)){const c=o.lastSegment(),u=o.popLast();return r.put({collectionId:c,parent:Oe(u)})}};return t.store(On).ee({Y:!0},((o,c)=>{const u=new ee(o);return s(u.popLast())})).next((()=>t.store(Or).ee({Y:!0},(([o,c,u],l)=>{const f=yt(c);return s(f.popLast())}))))}bi(e){const t=e.store(xr);return t.ee(((r,i)=>{const s=Li(i),o=Mg(this.serializer,s);return t.put(o)}))}Si(e,t){const r=t.store(On),i=[];return r.ee(((s,o)=>{const c=t.store(xo),u=(function(p){return p.document?new x(ee.fromString(p.document.name).popFirst(5)):p.noDocument?x.fromSegments(p.noDocument.path):p.unknownDocument?x.fromSegments(p.unknownDocument.path):M(36783)})(o).path.toArray(),l={prefixPath:u.slice(0,u.length-2),collectionGroup:u[u.length-2],documentId:u[u.length-1],readTime:o.readTime||[0,0],unknownDocument:o.unknownDocument,noDocument:o.noDocument,document:o.document,hasCommittedMutations:!!o.hasCommittedMutations};i.push(c.put(l))})).next((()=>v.waitFor(i)))}Di(e,t){const r=t.store(at),i=Wg(this.serializer),s=new sl(va.Vi,this.serializer.yt);return r.H().next((o=>{const c=new Map;return o.forEach((u=>{let l=c.get(u.userId)??W();Mn(this.serializer,u).keys().forEach((f=>l=l.add(f))),c.set(u.userId,l)})),v.forEach(c,((u,l)=>{const f=new De(l),p=Ea.wt(this.serializer,f),g=s.getIndexManager(f),A=wa.wt(f,this.serializer,g,s.referenceDelegate);return new Qg(i,A,p,g).recalculateAndSaveOverlaysForDocumentKeys(new Yc(t,je.ce),u).next()}))}))}}function Cf(n){n.createObjectStore(Mr,{keyPath:lw}).createIndex(Bu,hw,{unique:!0}),n.createObjectStore(xr,{keyPath:"targetId"}).createIndex(Dm,uw,{unique:!0}),n.createObjectStore(qn)}const Ht="IndexedDbPersistence",Ic=18e5,Tc=5e3,Ec="Failed to obtain exclusive access to the persistence layer. To allow shared access, multi-tab synchronization has to be enabled in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.",Kv="main";class ol{constructor(e,t,r,i,s,o,c,u,l,f,p=18){if(this.allowTabSynchronization=e,this.persistenceKey=t,this.clientId=r,this.Ci=s,this.window=o,this.document=c,this.Fi=l,this.Mi=f,this.xi=p,this.ai=null,this.ui=!1,this.isPrimary=!1,this.networkEnabled=!0,this.Oi=null,this.inForeground=!1,this.Ni=null,this.Bi=null,this.Li=Number.NEGATIVE_INFINITY,this.ki=g=>Promise.resolve(),!ol.v())throw new N(P.UNIMPLEMENTED,"This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");this.referenceDelegate=new Vv(this,i),this.Ki=t+Kv,this.serializer=new xg(u),this.qi=new cn(this.Ki,this.xi,new Gv(this.serializer)),this.ci=new wv,this.li=new kv(this.referenceDelegate,this.serializer),this.remoteDocumentCache=Wg(this.serializer),this.Pi=new Ev,this.window&&this.window.localStorage?this.Ui=this.window.localStorage:(this.Ui=null,f===!1&&me(Ht,"LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page."))}start(){return this.$i().then((()=>{if(!this.isPrimary&&!this.allowTabSynchronization)throw new N(P.FAILED_PRECONDITION,Ec);return this.Wi(),this.Qi(),this.Gi(),this.runTransaction("getHighestListenSequenceNumber","readonly",(e=>this.li.getHighestSequenceNumber(e)))})).then((e=>{this.ai=new je(e,this.Fi)})).then((()=>{this.ui=!0})).catch((e=>(this.qi&&this.qi.close(),Promise.reject(e))))}zi(e){return this.ki=async t=>{if(this.started)return e(t)},e(this.isPrimary)}setDatabaseDeletedListener(e){this.qi.q((async t=>{t.newVersion===null&&await e()}))}setNetworkEnabled(e){this.networkEnabled!==e&&(this.networkEnabled=e,this.Ci.enqueueAndForget((async()=>{this.started&&await this.$i()})))}$i(){return this.runTransaction("updateClientMetadataAndTryBecomePrimary","readwrite",(e=>so(e).put({clientId:this.clientId,updateTimeMs:Date.now(),networkEnabled:this.networkEnabled,inForeground:this.inForeground}).next((()=>{if(this.isPrimary)return this.ji(e).next((t=>{t||(this.isPrimary=!1,this.Ci.enqueueRetryable((()=>this.ki(!1))))}))})).next((()=>this.Hi(e))).next((t=>this.isPrimary&&!t?this.Ji(e).next((()=>!1)):!!t&&this.Zi(e).next((()=>!0)))))).catch((e=>{if(Tn(e))return k(Ht,"Failed to extend owner lease: ",e),this.isPrimary;if(!this.allowTabSynchronization)throw e;return k(Ht,"Releasing owner lease after error during lease refresh",e),!1})).then((e=>{this.isPrimary!==e&&this.Ci.enqueueRetryable((()=>this.ki(e))),this.isPrimary=e}))}ji(e){return Ci(e).get(lr).next((t=>v.resolve(this.Xi(t))))}Yi(e){return so(e).delete(this.clientId)}async es(){if(this.isPrimary&&!this.ts(this.Li,Ic)){this.Li=Date.now();const e=await this.runTransaction("maybeGarbageCollectMultiClientState","readwrite-primary",(t=>{const r=we(t,Lr);return r.H().next((i=>{const s=this.ns(i,Ic),o=i.filter((c=>s.indexOf(c)===-1));return v.forEach(o,(c=>r.delete(c.clientId))).next((()=>o))}))})).catch((()=>[]));if(this.Ui)for(const t of e)this.Ui.removeItem(this.rs(t.clientId))}}Gi(){this.Bi=this.Ci.enqueueAfterDelay("client_metadata_refresh",4e3,(()=>this.$i().then((()=>this.es())).then((()=>this.Gi()))))}Xi(e){return!!e&&e.ownerId===this.clientId}Hi(e){return this.Mi?v.resolve(!0):Ci(e).get(lr).next((t=>{if(t!==null&&this.ts(t.leaseTimestampMs,Tc)&&!this.ss(t.ownerId)){if(this.Xi(t)&&this.networkEnabled)return!0;if(!this.Xi(t)){if(!t.allowTabSynchronization)throw new N(P.FAILED_PRECONDITION,Ec);return!1}}return!(!this.networkEnabled||!this.inForeground)||so(e).H().next((r=>this.ns(r,Tc).find((i=>{if(this.clientId!==i.clientId){const s=!this.networkEnabled&&i.networkEnabled,o=!this.inForeground&&i.inForeground,c=this.networkEnabled===i.networkEnabled;if(s||o&&c)return!0}return!1}))===void 0))})).next((t=>(this.isPrimary!==t&&k(Ht,`Client ${t?"is":"is not"} eligible for a primary lease.`),t)))}async shutdown(){this.ui=!1,this._s(),this.Bi&&(this.Bi.cancel(),this.Bi=null),this.us(),this.cs(),await this.qi.runTransaction("shutdown","readwrite",[vs,Lr],(e=>{const t=new Yc(e,je.ce);return this.Ji(t).next((()=>this.Yi(t)))})),this.qi.close(),this.ls()}ns(e,t){return e.filter((r=>this.ts(r.updateTimeMs,t)&&!this.ss(r.clientId)))}hs(){return this.runTransaction("getActiveClients","readonly",(e=>so(e).H().next((t=>this.ns(t,Ic).map((r=>r.clientId))))))}get started(){return this.ui}getGlobalsCache(){return this.ci}getMutationQueue(e,t){return wa.wt(e,this.serializer,t,this.referenceDelegate)}getTargetCache(){return this.li}getRemoteDocumentCache(){return this.remoteDocumentCache}getIndexManager(e){return new Cv(e,this.serializer.yt.databaseId)}getDocumentOverlayCache(e){return Ea.wt(this.serializer,e)}getBundleCache(){return this.Pi}runTransaction(e,t,r){k(Ht,"Starting transaction:",e);const i=t==="readonly"?"readonly":"readwrite",s=(function(u){return u===18?Pw:u===17?Fm:u===16?Sw:u===15?ju:u===14?Lm:u===13?Mm:u===12?Rw:u===11?xm:void M(60245)})(this.xi);let o;return this.qi.runTransaction(e,i,s,(c=>(o=new Yc(c,this.ai?this.ai.next():je.ce),t==="readwrite-primary"?this.ji(o).next((u=>!!u||this.Hi(o))).next((u=>{if(!u)throw me(`Failed to obtain primary lease for action '${e}'.`),this.isPrimary=!1,this.Ci.enqueueRetryable((()=>this.ki(!1))),new N(P.FAILED_PRECONDITION,bm);return r(o)})).next((u=>this.Zi(o).next((()=>u)))):this.Ps(o).next((()=>r(o)))))).then((c=>(o.raiseOnCommittedEvent(),c)))}Ps(e){return Ci(e).get(lr).next((t=>{if(t!==null&&this.ts(t.leaseTimestampMs,Tc)&&!this.ss(t.ownerId)&&!this.Xi(t)&&!(this.Mi||this.allowTabSynchronization&&t.allowTabSynchronization))throw new N(P.FAILED_PRECONDITION,Ec)}))}Zi(e){const t={ownerId:this.clientId,allowTabSynchronization:this.allowTabSynchronization,leaseTimestampMs:Date.now()};return Ci(e).put(lr,t)}static v(){return cn.v()}Ji(e){const t=Ci(e);return t.get(lr).next((r=>this.Xi(r)?(k(Ht,"Releasing primary lease."),t.delete(lr)):v.resolve()))}ts(e,t){const r=Date.now();return!(e<r-t)&&(!(e>r)||(me(`Detected an update time that is in the future: ${e} > ${r}`),!1))}Wi(){this.document!==null&&typeof this.document.addEventListener=="function"&&(this.Ni=()=>{this.Ci.enqueueAndForget((()=>(this.inForeground=this.document.visibilityState==="visible",this.$i())))},this.document.addEventListener("visibilitychange",this.Ni),this.inForeground=this.document.visibilityState==="visible")}us(){this.Ni&&(this.document.removeEventListener("visibilitychange",this.Ni),this.Ni=null)}Qi(){typeof this.window?.addEventListener=="function"&&(this.Oi=()=>{this._s();const e=/(?:Version|Mobile)\/1[456]/;om()&&(navigator.appVersion.match(e)||navigator.userAgent.match(e))&&this.Ci.enterRestrictedMode(!0),this.Ci.enqueueAndForget((()=>this.shutdown()))},this.window.addEventListener("pagehide",this.Oi))}cs(){this.Oi&&(this.window.removeEventListener("pagehide",this.Oi),this.Oi=null)}ss(e){try{const t=this.Ui?.getItem(this.rs(e))!==null;return k(Ht,`Client '${e}' ${t?"is":"is not"} zombied in LocalStorage`),t}catch(t){return me(Ht,"Failed to get zombied client id.",t),!1}}_s(){if(this.Ui)try{this.Ui.setItem(this.rs(this.clientId),String(Date.now()))}catch(e){me("Failed to set zombie client id.",e)}}ls(){if(this.Ui)try{this.Ui.removeItem(this.rs(this.clientId))}catch{}}rs(e){return`firestore_zombie_${this.persistenceKey}_${e}`}}function Ci(n){return we(n,vs)}function so(n){return we(n,Lr)}function Jg(n,e){let t=n.projectId;return n.isDefaultDatabase||(t+="."+n.database),"firestore/"+e+"/"+t+"/"}/**
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
 */class al{constructor(e,t,r,i){this.targetId=e,this.fromCache=t,this.Ts=r,this.Is=i}static Es(e,t){let r=W(),i=W();for(const s of t.docChanges)switch(s.type){case 0:r=r.add(s.doc.key);break;case 1:i=i.add(s.doc.key)}return new al(e,t.fromCache,r,i)}}/**
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
 */class Hv{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(e){this._documentReadCount+=e}}/**
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
 */class Yg{constructor(){this.Rs=!1,this.As=!1,this.Vs=100,this.ds=(function(){return om()?8:Sm(Ee())>0?6:4})()}initialize(e,t){this.fs=e,this.indexManager=t,this.Rs=!0}getDocumentsMatchingQuery(e,t,r,i){const s={result:null};return this.gs(e,t).next((o=>{s.result=o})).next((()=>{if(!s.result)return this.ps(e,t,i,r).next((o=>{s.result=o}))})).next((()=>{if(s.result)return;const o=new Hv;return this.ys(e,t,o).next((c=>{if(s.result=c,this.As)return this.ws(e,t,o,c.size)}))})).next((()=>s.result))}ws(e,t,r,i){return r.documentReadCount<this.Vs?(gr()<=J.DEBUG&&k("QueryEngine","SDK will not create cache indexes for query:",_r(t),"since it only creates cache indexes for collection contains","more than or equal to",this.Vs,"documents"),v.resolve()):(gr()<=J.DEBUG&&k("QueryEngine","Query:",_r(t),"scans",r.documentReadCount,"local documents and returns",i,"documents as results."),r.documentReadCount>this.ds*i?(gr()<=J.DEBUG&&k("QueryEngine","The SDK decides to create cache indexes for query:",_r(t),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(e,Ze(t))):v.resolve())}gs(e,t){if(Xd(t))return v.resolve(null);let r=Ze(t);return this.indexManager.getIndexType(e,r).next((i=>i===0?null:(t.limit!==null&&i===1&&(t=iu(t,null,"F"),r=Ze(t)),this.indexManager.getDocumentsMatchingTarget(e,r).next((s=>{const o=W(...s);return this.fs.getDocuments(e,o).next((c=>this.indexManager.getMinOffset(e,r).next((u=>{const l=this.bs(t,c);return this.Ss(t,l,o,u.readTime)?this.gs(e,iu(t,null,"F")):this.Ds(e,l,t,u)}))))})))))}ps(e,t,r,i){return Xd(t)||i.isEqual(B.min())?v.resolve(null):this.fs.getDocuments(e,r).next((s=>{const o=this.bs(t,s);return this.Ss(t,o,r,i)?v.resolve(null):(gr()<=J.DEBUG&&k("QueryEngine","Re-using previous result from %s to execute query: %s",i.toString(),_r(t)),this.Ds(e,o,t,vm(i,Vr)).next((c=>c)))}))}bs(e,t){let r=new re(og(e));return t.forEach(((i,s)=>{Rs(e,s)&&(r=r.add(s))})),r}Ss(e,t,r,i){if(e.limit===null)return!1;if(r.size!==t.size)return!0;const s=e.limitType==="F"?t.last():t.first();return!!s&&(s.hasPendingWrites||s.version.compareTo(i)>0)}ys(e,t,r){return gr()<=J.DEBUG&&k("QueryEngine","Using full collection scan to execute query:",_r(t)),this.fs.getDocumentsMatchingQuery(e,t,nt.min(),r)}Ds(e,t,r,i){return this.fs.getDocumentsMatchingQuery(e,r,i).next((s=>(t.forEach((o=>{s=s.insert(o.key,o)})),s)))}}/**
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
 */const cl="LocalStore",Wv=3e8;class Qv{constructor(e,t,r,i){this.persistence=e,this.Cs=t,this.serializer=i,this.vs=new se(z),this.Fs=new Lt((s=>Wn(s)),As),this.Ms=new Map,this.xs=e.getRemoteDocumentCache(),this.li=e.getTargetCache(),this.Pi=e.getBundleCache(),this.Os(r)}Os(e){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(e),this.indexManager=this.persistence.getIndexManager(e),this.mutationQueue=this.persistence.getMutationQueue(e,this.indexManager),this.localDocuments=new Qg(this.xs,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.xs.setIndexManager(this.indexManager),this.Cs.initialize(this.localDocuments,this.indexManager)}collectGarbage(e){return this.persistence.runTransaction("Collect garbage","readwrite-primary",(t=>e.collect(t,this.vs)))}}function Xg(n,e,t,r){return new Qv(n,e,t,r)}async function Zg(n,e){const t=L(n);return await t.persistence.runTransaction("Handle user change","readonly",(r=>{let i;return t.mutationQueue.getAllMutationBatches(r).next((s=>(i=s,t.Os(e),t.mutationQueue.getAllMutationBatches(r)))).next((s=>{const o=[],c=[];let u=W();for(const l of i){o.push(l.batchId);for(const f of l.mutations)u=u.add(f.key)}for(const l of s){c.push(l.batchId);for(const f of l.mutations)u=u.add(f.key)}return t.localDocuments.getDocuments(r,u).next((l=>({Ns:l,removedBatchIds:o,addedBatchIds:c})))}))}))}function Jv(n,e){const t=L(n);return t.persistence.runTransaction("Acknowledge batch","readwrite-primary",(r=>{const i=e.batch.keys(),s=t.xs.newChangeBuffer({trackRemovals:!0});return(function(c,u,l,f){const p=l.batch,g=p.keys();let A=v.resolve();return g.forEach((C=>{A=A.next((()=>f.getEntry(u,C))).next((V=>{const D=l.docVersions.get(C);F(D!==null,48541),V.version.compareTo(D)<0&&(p.applyToRemoteDocument(V,l),V.isValidDocument()&&(V.setReadTime(l.commitVersion),f.addEntry(V)))}))})),A.next((()=>c.mutationQueue.removeMutationBatch(u,p)))})(t,r,e,s).next((()=>s.apply(r))).next((()=>t.mutationQueue.performConsistencyCheck(r))).next((()=>t.documentOverlayCache.removeOverlaysForBatchId(r,i,e.batch.batchId))).next((()=>t.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(r,(function(c){let u=W();for(let l=0;l<c.mutationResults.length;++l)c.mutationResults[l].transformResults.length>0&&(u=u.add(c.batch.mutations[l].key));return u})(e)))).next((()=>t.localDocuments.getDocuments(r,i)))}))}function e_(n){const e=L(n);return e.persistence.runTransaction("Get last remote snapshot version","readonly",(t=>e.li.getLastRemoteSnapshotVersion(t)))}function Yv(n,e){const t=L(n),r=e.snapshotVersion;let i=t.vs;return t.persistence.runTransaction("Apply remote event","readwrite-primary",(s=>{const o=t.xs.newChangeBuffer({trackRemovals:!0});i=t.vs;const c=[];e.targetChanges.forEach(((f,p)=>{const g=i.get(p);if(!g)return;c.push(t.li.removeMatchingKeys(s,f.removedDocuments,p).next((()=>t.li.addMatchingKeys(s,f.addedDocuments,p))));let A=g.withSequenceNumber(s.currentSequenceNumber);e.targetMismatches.get(p)!==null?A=A.withResumeToken(ge.EMPTY_BYTE_STRING,B.min()).withLastLimboFreeSnapshotVersion(B.min()):f.resumeToken.approximateByteSize()>0&&(A=A.withResumeToken(f.resumeToken,r)),i=i.insert(p,A),(function(V,D,j){return V.resumeToken.approximateByteSize()===0||D.snapshotVersion.toMicroseconds()-V.snapshotVersion.toMicroseconds()>=Wv?!0:j.addedDocuments.size+j.modifiedDocuments.size+j.removedDocuments.size>0})(g,A,f)&&c.push(t.li.updateTargetData(s,A))}));let u=Ye(),l=W();if(e.documentUpdates.forEach((f=>{e.resolvedLimboDocuments.has(f)&&c.push(t.persistence.referenceDelegate.updateLimboDocument(s,f))})),c.push(Xv(s,o,e.documentUpdates).next((f=>{u=f.Bs,l=f.Ls}))),!r.isEqual(B.min())){const f=t.li.getLastRemoteSnapshotVersion(s).next((p=>t.li.setTargetsMetadata(s,s.currentSequenceNumber,r)));c.push(f)}return v.waitFor(c).next((()=>o.apply(s))).next((()=>t.localDocuments.getLocalViewOfDocuments(s,u,l))).next((()=>u))})).then((s=>(t.vs=i,s)))}function Xv(n,e,t){let r=W(),i=W();return t.forEach((s=>r=r.add(s))),e.getEntries(n,r).next((s=>{let o=Ye();return t.forEach(((c,u)=>{const l=s.get(c);u.isFoundDocument()!==l.isFoundDocument()&&(i=i.add(c)),u.isNoDocument()&&u.version.isEqual(B.min())?(e.removeEntry(c,u.readTime),o=o.insert(c,u)):!l.isValidDocument()||u.version.compareTo(l.version)>0||u.version.compareTo(l.version)===0&&l.hasPendingWrites?(e.addEntry(u),o=o.insert(c,u)):k(cl,"Ignoring outdated watch update for ",c,". Current version:",l.version," Watch version:",u.version)})),{Bs:o,Ls:i}}))}function Zv(n,e){const t=L(n);return t.persistence.runTransaction("Get next mutation batch","readonly",(r=>(e===void 0&&(e=$n),t.mutationQueue.getNextMutationBatchAfterBatchId(r,e))))}function zo(n,e){const t=L(n);return t.persistence.runTransaction("Allocate target","readwrite",(r=>{let i;return t.li.getTargetData(r,e).next((s=>s?(i=s,v.resolve(i)):t.li.allocateTargetId(r).next((o=>(i=new St(e,o,"TargetPurposeListen",r.currentSequenceNumber),t.li.addTargetData(r,i).next((()=>i)))))))})).then((r=>{const i=t.vs.get(r.targetId);return(i===null||r.snapshotVersion.compareTo(i.snapshotVersion)>0)&&(t.vs=t.vs.insert(r.targetId,r),t.Fs.set(e,r.targetId)),r}))}async function Kr(n,e,t){const r=L(n),i=r.vs.get(e),s=t?"readwrite":"readwrite-primary";try{t||await r.persistence.runTransaction("Release target",s,(o=>r.persistence.referenceDelegate.removeTarget(o,i)))}catch(o){if(!Tn(o))throw o;k(cl,`Failed to update sequence numbers for target ${e}: ${o}`)}r.vs=r.vs.remove(e),r.Fs.delete(i.target)}function du(n,e,t){const r=L(n);let i=B.min(),s=W();return r.persistence.runTransaction("Execute query","readwrite",(o=>(function(u,l,f){const p=L(u),g=p.Fs.get(f);return g!==void 0?v.resolve(p.vs.get(g)):p.li.getTargetData(l,f)})(r,o,Ze(e)).next((c=>{if(c)return i=c.lastLimboFreeSnapshotVersion,r.li.getMatchingKeysForTargetId(o,c.targetId).next((u=>{s=u}))})).next((()=>r.Cs.getDocumentsMatchingQuery(o,e,t?i:B.min(),t?s:W()))).next((c=>(r_(r,sg(e),c),{documents:c,ks:s})))))}function t_(n,e){const t=L(n),r=L(t.li),i=t.vs.get(e);return i?Promise.resolve(i.target):t.persistence.runTransaction("Get target data","readonly",(s=>r.At(s,e).next((o=>o?o.target:null))))}function n_(n,e){const t=L(n),r=t.Ms.get(e)||B.min();return t.persistence.runTransaction("Get new document changes","readonly",(i=>t.xs.getAllFromCollectionGroup(i,e,vm(r,Vr),Number.MAX_SAFE_INTEGER))).then((i=>(r_(t,e,i),i)))}function r_(n,e,t){let r=n.Ms.get(e)||B.min();t.forEach(((i,s)=>{s.readTime.compareTo(r)>0&&(r=s.readTime)})),n.Ms.set(e,r)}/**
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
 */const i_="firestore_clients";function kf(n,e){return`${i_}_${n}_${e}`}const s_="firestore_mutations";function Df(n,e,t){let r=`${s_}_${n}_${t}`;return e.isAuthenticated()&&(r+=`_${e.uid}`),r}const o_="firestore_targets";function wc(n,e){return`${o_}_${n}_${e}`}/**
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
 */const _t="SharedClientState";class Go{constructor(e,t,r,i){this.user=e,this.batchId=t,this.state=r,this.error=i}static $s(e,t,r){const i=JSON.parse(r);let s,o=typeof i=="object"&&["pending","acknowledged","rejected"].indexOf(i.state)!==-1&&(i.error===void 0||typeof i.error=="object");return o&&i.error&&(o=typeof i.error.message=="string"&&typeof i.error.code=="string",o&&(s=new N(i.error.code,i.error.message))),o?new Go(e,t,i.state,s):(me(_t,`Failed to parse mutation state for ID '${t}': ${r}`),null)}Ws(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class Hi{constructor(e,t,r){this.targetId=e,this.state=t,this.error=r}static $s(e,t){const r=JSON.parse(t);let i,s=typeof r=="object"&&["not-current","current","rejected"].indexOf(r.state)!==-1&&(r.error===void 0||typeof r.error=="object");return s&&r.error&&(s=typeof r.error.message=="string"&&typeof r.error.code=="string",s&&(i=new N(r.error.code,r.error.message))),s?new Hi(e,r.state,i):(me(_t,`Failed to parse target state for ID '${e}': ${t}`),null)}Ws(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class Ko{constructor(e,t){this.clientId=e,this.activeTargetIds=t}static $s(e,t){const r=JSON.parse(t);let i=typeof r=="object"&&r.activeTargetIds instanceof Array,s=Wu();for(let o=0;i&&o<r.activeTargetIds.length;++o)i=Pm(r.activeTargetIds[o]),s=s.add(r.activeTargetIds[o]);return i?new Ko(e,s):(me(_t,`Failed to parse client data for instance '${e}': ${t}`),null)}}class ul{constructor(e,t){this.clientId=e,this.onlineState=t}static $s(e){const t=JSON.parse(e);return typeof t=="object"&&["Unknown","Online","Offline"].indexOf(t.onlineState)!==-1&&typeof t.clientId=="string"?new ul(t.clientId,t.onlineState):(me(_t,`Failed to parse online state: ${e}`),null)}}class fu{constructor(){this.activeTargetIds=Wu()}Qs(e){this.activeTargetIds=this.activeTargetIds.add(e)}Gs(e){this.activeTargetIds=this.activeTargetIds.delete(e)}Ws(){const e={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(e)}}class vc{constructor(e,t,r,i,s){this.window=e,this.Ci=t,this.persistenceKey=r,this.zs=i,this.syncEngine=null,this.onlineStateHandler=null,this.sequenceNumberHandler=null,this.js=this.Hs.bind(this),this.Js=new se(z),this.started=!1,this.Zs=[];const o=r.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");this.storage=this.window.localStorage,this.currentUser=s,this.Xs=kf(this.persistenceKey,this.zs),this.Ys=(function(u){return`firestore_sequence_number_${u}`})(this.persistenceKey),this.Js=this.Js.insert(this.zs,new fu),this.eo=new RegExp(`^${i_}_${o}_([^_]*)$`),this.no=new RegExp(`^${s_}_${o}_(\\d+)(?:_(.*))?$`),this.ro=new RegExp(`^${o_}_${o}_(\\d+)$`),this.io=(function(u){return`firestore_online_state_${u}`})(this.persistenceKey),this.so=(function(u){return`firestore_bundle_loaded_v2_${u}`})(this.persistenceKey),this.window.addEventListener("storage",this.js)}static v(e){return!(!e||!e.localStorage)}async start(){const e=await this.syncEngine.hs();for(const r of e){if(r===this.zs)continue;const i=this.getItem(kf(this.persistenceKey,r));if(i){const s=Ko.$s(r,i);s&&(this.Js=this.Js.insert(s.clientId,s))}}this.oo();const t=this.storage.getItem(this.io);if(t){const r=this._o(t);r&&this.ao(r)}for(const r of this.Zs)this.Hs(r);this.Zs=[],this.window.addEventListener("pagehide",(()=>this.shutdown())),this.started=!0}writeSequenceNumber(e){this.setItem(this.Ys,JSON.stringify(e))}getAllActiveQueryTargets(){return this.uo(this.Js)}isActiveQueryTarget(e){let t=!1;return this.Js.forEach(((r,i)=>{i.activeTargetIds.has(e)&&(t=!0)})),t}addPendingMutation(e){this.co(e,"pending")}updateMutationState(e,t,r){this.co(e,t,r),this.lo(e)}addLocalQueryTarget(e,t=!0){let r="not-current";if(this.isActiveQueryTarget(e)){const i=this.storage.getItem(wc(this.persistenceKey,e));if(i){const s=Hi.$s(e,i);s&&(r=s.state)}}return t&&this.ho.Qs(e),this.oo(),r}removeLocalQueryTarget(e){this.ho.Gs(e),this.oo()}isLocalQueryTarget(e){return this.ho.activeTargetIds.has(e)}clearQueryState(e){this.removeItem(wc(this.persistenceKey,e))}updateQueryState(e,t,r){this.Po(e,t,r)}handleUserChange(e,t,r){t.forEach((i=>{this.lo(i)})),this.currentUser=e,r.forEach((i=>{this.addPendingMutation(i)}))}setOnlineState(e){this.To(e)}notifyBundleLoaded(e){this.Io(e)}shutdown(){this.started&&(this.window.removeEventListener("storage",this.js),this.removeItem(this.Xs),this.started=!1)}getItem(e){const t=this.storage.getItem(e);return k(_t,"READ",e,t),t}setItem(e,t){k(_t,"SET",e,t),this.storage.setItem(e,t)}removeItem(e){k(_t,"REMOVE",e),this.storage.removeItem(e)}Hs(e){const t=e;if(t.storageArea===this.storage){if(k(_t,"EVENT",t.key,t.newValue),t.key===this.Xs)return void me("Received WebStorage notification for local change. Another client might have garbage-collected our state");this.Ci.enqueueRetryable((async()=>{if(this.started){if(t.key!==null){if(this.eo.test(t.key)){if(t.newValue==null){const r=this.Eo(t.key);return this.Ro(r,null)}{const r=this.Ao(t.key,t.newValue);if(r)return this.Ro(r.clientId,r)}}else if(this.no.test(t.key)){if(t.newValue!==null){const r=this.Vo(t.key,t.newValue);if(r)return this.mo(r)}}else if(this.ro.test(t.key)){if(t.newValue!==null){const r=this.fo(t.key,t.newValue);if(r)return this.po(r)}}else if(t.key===this.io){if(t.newValue!==null){const r=this._o(t.newValue);if(r)return this.ao(r)}}else if(t.key===this.Ys){const r=(function(s){let o=je.ce;if(s!=null)try{const c=JSON.parse(s);F(typeof c=="number",30636,{yo:s}),o=c}catch(c){me(_t,"Failed to read sequence number from WebStorage",c)}return o})(t.newValue);r!==je.ce&&this.sequenceNumberHandler(r)}else if(t.key===this.so){const r=this.wo(t.newValue);await Promise.all(r.map((i=>this.syncEngine.bo(i))))}}}else this.Zs.push(t)}))}}get ho(){return this.Js.get(this.zs)}oo(){this.setItem(this.Xs,this.ho.Ws())}co(e,t,r){const i=new Go(this.currentUser,e,t,r),s=Df(this.persistenceKey,this.currentUser,e);this.setItem(s,i.Ws())}lo(e){const t=Df(this.persistenceKey,this.currentUser,e);this.removeItem(t)}To(e){const t={clientId:this.zs,onlineState:e};this.storage.setItem(this.io,JSON.stringify(t))}Po(e,t,r){const i=wc(this.persistenceKey,e),s=new Hi(e,t,r);this.setItem(i,s.Ws())}Io(e){const t=JSON.stringify(Array.from(e));this.setItem(this.so,t)}Eo(e){const t=this.eo.exec(e);return t?t[1]:null}Ao(e,t){const r=this.Eo(e);return Ko.$s(r,t)}Vo(e,t){const r=this.no.exec(e),i=Number(r[1]),s=r[2]!==void 0?r[2]:null;return Go.$s(new De(s),i,t)}fo(e,t){const r=this.ro.exec(e),i=Number(r[1]);return Hi.$s(i,t)}_o(e){return ul.$s(e)}wo(e){return JSON.parse(e)}async mo(e){if(e.user.uid===this.currentUser.uid)return this.syncEngine.So(e.batchId,e.state,e.error);k(_t,`Ignoring mutation for non-active user ${e.user.uid}`)}po(e){return this.syncEngine.Do(e.targetId,e.state,e.error)}Ro(e,t){const r=t?this.Js.insert(e,t):this.Js.remove(e),i=this.uo(this.Js),s=this.uo(r),o=[],c=[];return s.forEach((u=>{i.has(u)||o.push(u)})),i.forEach((u=>{s.has(u)||c.push(u)})),this.syncEngine.Co(o,c).then((()=>{this.Js=r}))}ao(e){this.Js.get(e.clientId)&&this.onlineStateHandler(e.onlineState)}uo(e){let t=Wu();return e.forEach(((r,i)=>{t=t.unionWith(i.activeTargetIds)})),t}}class a_{constructor(){this.vo=new fu,this.Fo={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(e){}updateMutationState(e,t,r){}addLocalQueryTarget(e,t=!0){return t&&this.vo.Qs(e),this.Fo[e]||"not-current"}updateQueryState(e,t,r){this.Fo[e]=t}removeLocalQueryTarget(e){this.vo.Gs(e)}isLocalQueryTarget(e){return this.vo.activeTargetIds.has(e)}clearQueryState(e){delete this.Fo[e]}getAllActiveQueryTargets(){return this.vo.activeTargetIds}isActiveQueryTarget(e){return this.vo.activeTargetIds.has(e)}start(){return this.vo=new fu,Promise.resolve()}handleUserChange(e,t,r){}setOnlineState(e){}shutdown(){}writeSequenceNumber(e){}notifyBundleLoaded(e){}}/**
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
 */class eA{Mo(e){}shutdown(){}}/**
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
 */const Nf="ConnectivityMonitor";class Vf{constructor(){this.xo=()=>this.Oo(),this.No=()=>this.Bo(),this.Lo=[],this.ko()}Mo(e){this.Lo.push(e)}shutdown(){window.removeEventListener("online",this.xo),window.removeEventListener("offline",this.No)}ko(){window.addEventListener("online",this.xo),window.addEventListener("offline",this.No)}Oo(){k(Nf,"Network connectivity changed: AVAILABLE");for(const e of this.Lo)e(0)}Bo(){k(Nf,"Network connectivity changed: UNAVAILABLE");for(const e of this.Lo)e(1)}static v(){return typeof window<"u"&&window.addEventListener!==void 0&&window.removeEventListener!==void 0}}/**
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
 */let oo=null;function pu(){return oo===null?oo=(function(){return 268435456+Math.round(2147483648*Math.random())})():oo++,"0x"+oo.toString(16)}/**
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
 */const Ac="RestConnection",tA={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery",ExecutePipeline:"executePipeline"};class nA{get Ko(){return!1}constructor(e){this.databaseInfo=e,this.databaseId=e.databaseId;const t=e.ssl?"https":"http",r=encodeURIComponent(this.databaseId.projectId),i=encodeURIComponent(this.databaseId.database);this.qo=t+"://"+e.host,this.Uo=`projects/${r}/databases/${i}`,this.$o=this.databaseId.database===Lo?`project_id=${r}`:`project_id=${r}&database_id=${i}`}Wo(e,t,r,i,s){const o=pu(),c=this.Qo(e,t.toUriEncodedString());k(Ac,`Sending RPC '${e}' ${o}:`,c,r);const u={"google-cloud-resource-prefix":this.Uo,"x-goog-request-params":this.$o};this.Go(u,i,s);const{host:l}=new URL(c),f=bt(l);return this.zo(e,c,u,r,f).then((p=>(k(Ac,`Received RPC '${e}' ${o}: `,p),p)),(p=>{throw Dr(Ac,`RPC '${e}' ${o} failed with error: `,p,"url: ",c,"request:",r),p}))}jo(e,t,r,i,s,o){return this.Wo(e,t,r,i,s)}Go(e,t,r){e["X-Goog-Api-Client"]=(function(){return"gl-js/ fire/"+Xr})(),e["Content-Type"]="text/plain",this.databaseInfo.appId&&(e["X-Firebase-GMPID"]=this.databaseInfo.appId),t&&t.headers.forEach(((i,s)=>e[s]=i)),r&&r.headers.forEach(((i,s)=>e[s]=i))}Qo(e,t){const r=tA[e];let i=`${this.qo}/v1/${t}:${r}`;return this.databaseInfo.apiKey&&(i=`${i}?key=${encodeURIComponent(this.databaseInfo.apiKey)}`),i}terminate(){}}/**
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
 */class rA{constructor(e){this.Ho=e.Ho,this.Jo=e.Jo}Zo(e){this.Xo=e}Yo(e){this.e_=e}t_(e){this.n_=e}onMessage(e){this.r_=e}close(){this.Jo()}send(e){this.Ho(e)}i_(){this.Xo()}s_(){this.e_()}o_(e){this.n_(e)}__(e){this.r_(e)}}/**
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
 */const ke="WebChannelConnection",ki=(n,e,t)=>{n.listen(e,(r=>{try{t(r)}catch(i){setTimeout((()=>{throw i}),0)}}))};class Ar extends nA{constructor(e){super(e),this.a_=[],this.forceLongPolling=e.forceLongPolling,this.autoDetectLongPolling=e.autoDetectLongPolling,this.useFetchStreams=e.useFetchStreams,this.longPollingOptions=e.longPollingOptions}static u_(){if(!Ar.c_){const e=_m();ki(e,gm.STAT_EVENT,(t=>{t.stat===Gc.PROXY?k(ke,"STAT_EVENT: detected buffering proxy"):t.stat===Gc.NOPROXY&&k(ke,"STAT_EVENT: detected no buffering proxy")})),Ar.c_=!0}}zo(e,t,r,i,s){const o=pu();return new Promise(((c,u)=>{const l=new pm;l.setWithCredentials(!0),l.listenOnce(mm.COMPLETE,(()=>{try{switch(l.getLastErrorCode()){case fo.NO_ERROR:const p=l.getResponseJson();k(ke,`XHR for RPC '${e}' ${o} received:`,JSON.stringify(p)),c(p);break;case fo.TIMEOUT:k(ke,`RPC '${e}' ${o} timed out`),u(new N(P.DEADLINE_EXCEEDED,"Request time out"));break;case fo.HTTP_ERROR:const g=l.getStatus();if(k(ke,`RPC '${e}' ${o} failed with status:`,g,"response text:",l.getResponseText()),g>0){let A=l.getResponseJson();Array.isArray(A)&&(A=A[0]);const C=A?.error;if(C&&C.status&&C.message){const V=(function(j){const q=j.toLowerCase().replace(/_/g,"-");return Object.values(P).indexOf(q)>=0?q:P.UNKNOWN})(C.status);u(new N(V,C.message))}else u(new N(P.UNKNOWN,"Server responded with status "+l.getStatus()))}else u(new N(P.UNAVAILABLE,"Connection failed."));break;default:M(9055,{l_:e,streamId:o,h_:l.getLastErrorCode(),P_:l.getLastError()})}}finally{k(ke,`RPC '${e}' ${o} completed.`)}}));const f=JSON.stringify(i);k(ke,`RPC '${e}' ${o} sending request:`,i),l.send(t,"POST",f,r,15)}))}T_(e,t,r){const i=pu(),s=[this.qo,"/","google.firestore.v1.Firestore","/",e,"/channel"],o=this.createWebChannelTransport(),c={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},u=this.longPollingOptions.timeoutSeconds;u!==void 0&&(c.longPollingTimeout=Math.round(1e3*u)),this.useFetchStreams&&(c.useFetchStreams=!0),this.Go(c.initMessageHeaders,t,r),c.encodeInitMessageHeaders=!0;const l=s.join("");k(ke,`Creating RPC '${e}' stream ${i}: ${l}`,c);const f=o.createWebChannel(l,c);this.I_(f);let p=!1,g=!1;const A=new rA({Ho:C=>{g?k(ke,`Not sending because RPC '${e}' stream ${i} is closed:`,C):(p||(k(ke,`Opening RPC '${e}' stream ${i} transport.`),f.open(),p=!0),k(ke,`RPC '${e}' stream ${i} sending:`,C),f.send(C))},Jo:()=>f.close()});return ki(f,Oi.EventType.OPEN,(()=>{g||(k(ke,`RPC '${e}' stream ${i} transport opened.`),A.i_())})),ki(f,Oi.EventType.CLOSE,(()=>{g||(g=!0,k(ke,`RPC '${e}' stream ${i} transport closed`),A.o_(),this.E_(f))})),ki(f,Oi.EventType.ERROR,(C=>{g||(g=!0,Dr(ke,`RPC '${e}' stream ${i} transport errored. Name:`,C.name,"Message:",C.message),A.o_(new N(P.UNAVAILABLE,"The operation could not be completed")))})),ki(f,Oi.EventType.MESSAGE,(C=>{if(!g){const V=C.data[0];F(!!V,16349);const D=V,j=D?.error||D[0]?.error;if(j){k(ke,`RPC '${e}' stream ${i} received error:`,j);const q=j.status;let U=(function(Q){const T=_e[Q];if(T!==void 0)return Tg(T)})(q),G=j.message;q==="NOT_FOUND"&&G.includes("database")&&G.includes("does not exist")&&G.includes(this.databaseId.database)&&Dr(`Database '${this.databaseId.database}' not found. Please check your project configuration.`),U===void 0&&(U=P.INTERNAL,G="Unknown error status: "+q+" with message "+j.message),g=!0,A.o_(new N(U,G)),f.close()}else k(ke,`RPC '${e}' stream ${i} received:`,V),A.__(V)}})),Ar.u_(),setTimeout((()=>{A.s_()}),0),A}terminate(){this.a_.forEach((e=>e.close())),this.a_=[]}I_(e){this.a_.push(e)}E_(e){this.a_=this.a_.filter((t=>t===e))}Go(e,t,r){super.Go(e,t,r),this.databaseInfo.apiKey&&(e["x-goog-api-key"]=this.databaseInfo.apiKey)}createWebChannelTransport(){return ym()}}/**
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
 */function iA(n){return new Ar(n)}/**
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
 */function c_(){return typeof window<"u"?window:null}function vo(){return typeof document<"u"?document:null}/**
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
 */function Aa(n){return new uv(n,!0)}/**
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
 */Ar.c_=!1;class ll{constructor(e,t,r=1e3,i=1.5,s=6e4){this.Ci=e,this.timerId=t,this.R_=r,this.A_=i,this.V_=s,this.d_=0,this.m_=null,this.f_=Date.now(),this.reset()}reset(){this.d_=0}g_(){this.d_=this.V_}p_(e){this.cancel();const t=Math.floor(this.d_+this.y_()),r=Math.max(0,Date.now()-this.f_),i=Math.max(0,t-r);i>0&&k("ExponentialBackoff",`Backing off for ${i} ms (base delay: ${this.d_} ms, delay with jitter: ${t} ms, last attempt: ${r} ms ago)`),this.m_=this.Ci.enqueueAfterDelay(this.timerId,i,(()=>(this.f_=Date.now(),e()))),this.d_*=this.A_,this.d_<this.R_&&(this.d_=this.R_),this.d_>this.V_&&(this.d_=this.V_)}w_(){this.m_!==null&&(this.m_.skipDelay(),this.m_=null)}cancel(){this.m_!==null&&(this.m_.cancel(),this.m_=null)}y_(){return(Math.random()-.5)*this.d_}}/**
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
 */const Of="PersistentStream";class u_{constructor(e,t,r,i,s,o,c,u){this.Ci=e,this.b_=r,this.S_=i,this.connection=s,this.authCredentialsProvider=o,this.appCheckCredentialsProvider=c,this.listener=u,this.state=0,this.D_=0,this.C_=null,this.v_=null,this.stream=null,this.F_=0,this.M_=new ll(e,t)}x_(){return this.state===1||this.state===5||this.O_()}O_(){return this.state===2||this.state===3}start(){this.F_=0,this.state!==4?this.auth():this.N_()}async stop(){this.x_()&&await this.close(0)}B_(){this.state=0,this.M_.reset()}L_(){this.O_()&&this.C_===null&&(this.C_=this.Ci.enqueueAfterDelay(this.b_,6e4,(()=>this.k_())))}K_(e){this.q_(),this.stream.send(e)}async k_(){if(this.O_())return this.close(0)}q_(){this.C_&&(this.C_.cancel(),this.C_=null)}U_(){this.v_&&(this.v_.cancel(),this.v_=null)}async close(e,t){this.q_(),this.U_(),this.M_.cancel(),this.D_++,e!==4?this.M_.reset():t&&t.code===P.RESOURCE_EXHAUSTED?(me(t.toString()),me("Using maximum backoff delay to prevent overloading the backend."),this.M_.g_()):t&&t.code===P.UNAUTHENTICATED&&this.state!==3&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),this.stream!==null&&(this.W_(),this.stream.close(),this.stream=null),this.state=e,await this.listener.t_(t)}W_(){}auth(){this.state=1;const e=this.Q_(this.D_),t=this.D_;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then((([r,i])=>{this.D_===t&&this.G_(r,i)}),(r=>{e((()=>{const i=new N(P.UNKNOWN,"Fetching auth token failed: "+r.message);return this.z_(i)}))}))}G_(e,t){const r=this.Q_(this.D_);this.stream=this.j_(e,t),this.stream.Zo((()=>{r((()=>this.listener.Zo()))})),this.stream.Yo((()=>{r((()=>(this.state=2,this.v_=this.Ci.enqueueAfterDelay(this.S_,1e4,(()=>(this.O_()&&(this.state=3),Promise.resolve()))),this.listener.Yo())))})),this.stream.t_((i=>{r((()=>this.z_(i)))})),this.stream.onMessage((i=>{r((()=>++this.F_==1?this.H_(i):this.onNext(i)))}))}N_(){this.state=5,this.M_.p_((async()=>{this.state=0,this.start()}))}z_(e){return k(Of,`close with error: ${e}`),this.stream=null,this.close(4,e)}Q_(e){return t=>{this.Ci.enqueueAndForget((()=>this.D_===e?t():(k(Of,"stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve())))}}}class sA extends u_{constructor(e,t,r,i,s,o){super(e,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",t,r,i,o),this.serializer=s}j_(e,t){return this.connection.T_("Listen",e,t)}H_(e){return this.onNext(e)}onNext(e){this.M_.reset();const t=fv(this.serializer,e),r=(function(s){if(!("targetChange"in s))return B.min();const o=s.targetChange;return o.targetIds&&o.targetIds.length?B.min():o.readTime?Re(o.readTime):B.min()})(e);return this.listener.J_(t,r)}Z_(e){const t={};t.database=au(this.serializer),t.addTarget=(function(s,o){let c;const u=o.target;if(c=Fo(u)?{documents:Pg(s,u)}:{query:Cg(s,u).ft},c.targetId=o.targetId,o.resumeToken.approximateByteSize()>0){c.resumeToken=vg(s,o.resumeToken);const l=su(s,o.expectedCount);l!==null&&(c.expectedCount=l)}else if(o.snapshotVersion.compareTo(B.min())>0){c.readTime=Gr(s,o.snapshotVersion.toTimestamp());const l=su(s,o.expectedCount);l!==null&&(c.expectedCount=l)}return c})(this.serializer,e);const r=mv(this.serializer,e);r&&(t.labels=r),this.K_(t)}X_(e){const t={};t.database=au(this.serializer),t.removeTarget=e,this.K_(t)}}class oA extends u_{constructor(e,t,r,i,s,o){super(e,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",t,r,i,o),this.serializer=s}get Y_(){return this.F_>0}start(){this.lastStreamToken=void 0,super.start()}W_(){this.Y_&&this.ea([])}j_(e,t){return this.connection.T_("Write",e,t)}H_(e){return F(!!e.streamToken,31322),this.lastStreamToken=e.streamToken,F(!e.writeResults||e.writeResults.length===0,55816),this.listener.ta()}onNext(e){F(!!e.streamToken,12678),this.lastStreamToken=e.streamToken,this.M_.reset();const t=pv(e.writeResults,e.commitTime),r=Re(e.commitTime);return this.listener.na(r,t)}ra(){const e={};e.database=au(this.serializer),this.K_(e)}ea(e){const t={streamToken:this.lastStreamToken,writes:e.map((r=>ds(this.serializer,r)))};this.K_(t)}}/**
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
 */class aA{}class cA extends aA{constructor(e,t,r,i){super(),this.authCredentials=e,this.appCheckCredentials=t,this.connection=r,this.serializer=i,this.ia=!1}sa(){if(this.ia)throw new N(P.FAILED_PRECONDITION,"The client has already been terminated.")}Wo(e,t,r,i){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then((([s,o])=>this.connection.Wo(e,ou(t,r),i,s,o))).catch((s=>{throw s.name==="FirebaseError"?(s.code===P.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),s):new N(P.UNKNOWN,s.toString())}))}jo(e,t,r,i,s){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then((([o,c])=>this.connection.jo(e,ou(t,r),i,o,c,s))).catch((o=>{throw o.name==="FirebaseError"?(o.code===P.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),o):new N(P.UNKNOWN,o.toString())}))}terminate(){this.ia=!0,this.connection.terminate()}}function uA(n,e,t,r){return new cA(n,e,t,r)}class lA{constructor(e,t){this.asyncQueue=e,this.onlineStateHandler=t,this.state="Unknown",this.oa=0,this._a=null,this.aa=!0}ua(){this.oa===0&&(this.ca("Unknown"),this._a=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,(()=>(this._a=null,this.la("Backend didn't respond within 10 seconds."),this.ca("Offline"),Promise.resolve()))))}ha(e){this.state==="Online"?this.ca("Unknown"):(this.oa++,this.oa>=1&&(this.Pa(),this.la(`Connection failed 1 times. Most recent error: ${e.toString()}`),this.ca("Offline")))}set(e){this.Pa(),this.oa=0,e==="Online"&&(this.aa=!1),this.ca(e)}ca(e){e!==this.state&&(this.state=e,this.onlineStateHandler(e))}la(e){const t=`Could not reach Cloud Firestore backend. ${e}
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;this.aa?(me(t),this.aa=!1):k("OnlineStateTracker",t)}Pa(){this._a!==null&&(this._a.cancel(),this._a=null)}}/**
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
 */const Xn="RemoteStore";class hA{constructor(e,t,r,i,s){this.localStore=e,this.datastore=t,this.asyncQueue=r,this.remoteSyncer={},this.Ta=[],this.Ia=new Map,this.Ea=new Set,this.Ra=[],this.Aa=s,this.Aa.Mo((o=>{r.enqueueAndForget((async()=>{or(this)&&(k(Xn,"Restarting streams for network reachability change."),await(async function(u){const l=L(u);l.Ea.add(4),await Cs(l),l.Va.set("Unknown"),l.Ea.delete(4),await ba(l)})(this))}))})),this.Va=new lA(r,i)}}async function ba(n){if(or(n))for(const e of n.Ra)await e(!0)}async function Cs(n){for(const e of n.Ra)await e(!1)}function Ra(n,e){const t=L(n);t.Ia.has(e.targetId)||(t.Ia.set(e.targetId,e),fl(t)?dl(t):ri(t).O_()&&hl(t,e))}function Hr(n,e){const t=L(n),r=ri(t);t.Ia.delete(e),r.O_()&&l_(t,e),t.Ia.size===0&&(r.O_()?r.L_():or(t)&&t.Va.set("Unknown"))}function hl(n,e){if(n.da.$e(e.targetId),e.resumeToken.approximateByteSize()>0||e.snapshotVersion.compareTo(B.min())>0){const t=n.remoteSyncer.getRemoteKeysForTarget(e.targetId).size;e=e.withExpectedCount(t)}ri(n).Z_(e)}function l_(n,e){n.da.$e(e),ri(n).X_(e)}function dl(n){n.da=new sv({getRemoteKeysForTarget:e=>n.remoteSyncer.getRemoteKeysForTarget(e),At:e=>n.Ia.get(e)||null,ht:()=>n.datastore.serializer.databaseId}),ri(n).start(),n.Va.ua()}function fl(n){return or(n)&&!ri(n).x_()&&n.Ia.size>0}function or(n){return L(n).Ea.size===0}function h_(n){n.da=void 0}async function dA(n){n.Va.set("Online")}async function fA(n){n.Ia.forEach(((e,t)=>{hl(n,e)}))}async function pA(n,e){h_(n),fl(n)?(n.Va.ha(e),dl(n)):n.Va.set("Unknown")}async function mA(n,e,t){if(n.Va.set("Online"),e instanceof wg&&e.state===2&&e.cause)try{await(async function(i,s){const o=s.cause;for(const c of s.targetIds)i.Ia.has(c)&&(await i.remoteSyncer.rejectListen(c,o),i.Ia.delete(c),i.da.removeTarget(c))})(n,e)}catch(r){k(Xn,"Failed to remove targets %s: %s ",e.targetIds.join(","),r),await Ho(n,r)}else if(e instanceof Eo?n.da.Xe(e):e instanceof Eg?n.da.st(e):n.da.tt(e),!t.isEqual(B.min()))try{const r=await e_(n.localStore);t.compareTo(r)>=0&&await(function(s,o){const c=s.da.Tt(o);return c.targetChanges.forEach(((u,l)=>{if(u.resumeToken.approximateByteSize()>0){const f=s.Ia.get(l);f&&s.Ia.set(l,f.withResumeToken(u.resumeToken,o))}})),c.targetMismatches.forEach(((u,l)=>{const f=s.Ia.get(u);if(!f)return;s.Ia.set(u,f.withResumeToken(ge.EMPTY_BYTE_STRING,f.snapshotVersion)),l_(s,u);const p=new St(f.target,u,l,f.sequenceNumber);hl(s,p)})),s.remoteSyncer.applyRemoteEvent(c)})(n,t)}catch(r){k(Xn,"Failed to raise snapshot:",r),await Ho(n,r)}}async function Ho(n,e,t){if(!Tn(e))throw e;n.Ea.add(1),await Cs(n),n.Va.set("Offline"),t||(t=()=>e_(n.localStore)),n.asyncQueue.enqueueRetryable((async()=>{k(Xn,"Retrying IndexedDB access"),await t(),n.Ea.delete(1),await ba(n)}))}function d_(n,e){return e().catch((t=>Ho(n,t,e)))}async function ni(n){const e=L(n),t=pn(e);let r=e.Ta.length>0?e.Ta[e.Ta.length-1].batchId:$n;for(;gA(e);)try{const i=await Zv(e.localStore,r);if(i===null){e.Ta.length===0&&t.L_();break}r=i.batchId,_A(e,i)}catch(i){await Ho(e,i)}f_(e)&&p_(e)}function gA(n){return or(n)&&n.Ta.length<10}function _A(n,e){n.Ta.push(e);const t=pn(n);t.O_()&&t.Y_&&t.ea(e.mutations)}function f_(n){return or(n)&&!pn(n).x_()&&n.Ta.length>0}function p_(n){pn(n).start()}async function yA(n){pn(n).ra()}async function IA(n){const e=pn(n);for(const t of n.Ta)e.ea(t.mutations)}async function TA(n,e,t){const r=n.Ta.shift(),i=Xu.from(r,e,t);await d_(n,(()=>n.remoteSyncer.applySuccessfulWrite(i))),await ni(n)}async function EA(n,e){e&&pn(n).Y_&&await(async function(r,i){if((function(o){return Ig(o)&&o!==P.ABORTED})(i.code)){const s=r.Ta.shift();pn(r).B_(),await d_(r,(()=>r.remoteSyncer.rejectFailedWrite(s.batchId,i))),await ni(r)}})(n,e),f_(n)&&p_(n)}async function xf(n,e){const t=L(n);t.asyncQueue.verifyOperationInProgress(),k(Xn,"RemoteStore received new credentials");const r=or(t);t.Ea.add(3),await Cs(t),r&&t.Va.set("Unknown"),await t.remoteSyncer.handleCredentialChange(e),t.Ea.delete(3),await ba(t)}async function mu(n,e){const t=L(n);e?(t.Ea.delete(2),await ba(t)):e||(t.Ea.add(2),await Cs(t),t.Va.set("Unknown"))}function ri(n){return n.ma||(n.ma=(function(t,r,i){const s=L(t);return s.sa(),new sA(r,s.connection,s.authCredentials,s.appCheckCredentials,s.serializer,i)})(n.datastore,n.asyncQueue,{Zo:dA.bind(null,n),Yo:fA.bind(null,n),t_:pA.bind(null,n),J_:mA.bind(null,n)}),n.Ra.push((async e=>{e?(n.ma.B_(),fl(n)?dl(n):n.Va.set("Unknown")):(await n.ma.stop(),h_(n))}))),n.ma}function pn(n){return n.fa||(n.fa=(function(t,r,i){const s=L(t);return s.sa(),new oA(r,s.connection,s.authCredentials,s.appCheckCredentials,s.serializer,i)})(n.datastore,n.asyncQueue,{Zo:()=>Promise.resolve(),Yo:yA.bind(null,n),t_:EA.bind(null,n),ta:IA.bind(null,n),na:TA.bind(null,n)}),n.Ra.push((async e=>{e?(n.fa.B_(),await ni(n)):(await n.fa.stop(),n.Ta.length>0&&(k(Xn,`Stopping write stream with ${n.Ta.length} pending writes`),n.Ta=[]))}))),n.fa}/**
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
 */class pl{constructor(e,t,r,i,s){this.asyncQueue=e,this.timerId=t,this.targetTimeMs=r,this.op=i,this.removalCallback=s,this.deferred=new lt,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch((o=>{}))}get promise(){return this.deferred.promise}static createAndSchedule(e,t,r,i,s){const o=Date.now()+r,c=new pl(e,t,o,i,s);return c.start(r),c}start(e){this.timerHandle=setTimeout((()=>this.handleDelayElapsed()),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new N(P.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget((()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then((e=>this.deferred.resolve(e)))):Promise.resolve()))}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function ml(n,e){if(me("AsyncQueue",`${e}: ${n}`),Tn(n))return new N(P.UNAVAILABLE,`${e}: ${n}`);throw n}/**
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
 */class br{static emptySet(e){return new br(e.comparator)}constructor(e){this.comparator=e?(t,r)=>e(t,r)||x.comparator(t.key,r.key):(t,r)=>x.comparator(t.key,r.key),this.keyedMap=xi(),this.sortedSet=new se(this.comparator)}has(e){return this.keyedMap.get(e)!=null}get(e){return this.keyedMap.get(e)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(e){const t=this.keyedMap.get(e);return t?this.sortedSet.indexOf(t):-1}get size(){return this.sortedSet.size}forEach(e){this.sortedSet.inorderTraversal(((t,r)=>(e(t),!1)))}add(e){const t=this.delete(e.key);return t.copy(t.keyedMap.insert(e.key,e),t.sortedSet.insert(e,null))}delete(e){const t=this.get(e);return t?this.copy(this.keyedMap.remove(e),this.sortedSet.remove(t)):this}isEqual(e){if(!(e instanceof br)||this.size!==e.size)return!1;const t=this.sortedSet.getIterator(),r=e.sortedSet.getIterator();for(;t.hasNext();){const i=t.getNext().key,s=r.getNext().key;if(!i.isEqual(s))return!1}return!0}toString(){const e=[];return this.forEach((t=>{e.push(t.toString())})),e.length===0?"DocumentSet ()":`DocumentSet (
  `+e.join(`  
`)+`
)`}copy(e,t){const r=new br;return r.comparator=this.comparator,r.keyedMap=e,r.sortedSet=t,r}}/**
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
 */class Mf{constructor(){this.ga=new se(x.comparator)}track(e){const t=e.doc.key,r=this.ga.get(t);r?e.type!==0&&r.type===3?this.ga=this.ga.insert(t,e):e.type===3&&r.type!==1?this.ga=this.ga.insert(t,{type:r.type,doc:e.doc}):e.type===2&&r.type===2?this.ga=this.ga.insert(t,{type:2,doc:e.doc}):e.type===2&&r.type===0?this.ga=this.ga.insert(t,{type:0,doc:e.doc}):e.type===1&&r.type===0?this.ga=this.ga.remove(t):e.type===1&&r.type===2?this.ga=this.ga.insert(t,{type:1,doc:r.doc}):e.type===0&&r.type===1?this.ga=this.ga.insert(t,{type:2,doc:e.doc}):M(63341,{Vt:e,pa:r}):this.ga=this.ga.insert(t,e)}ya(){const e=[];return this.ga.inorderTraversal(((t,r)=>{e.push(r)})),e}}class Wr{constructor(e,t,r,i,s,o,c,u,l){this.query=e,this.docs=t,this.oldDocs=r,this.docChanges=i,this.mutatedKeys=s,this.fromCache=o,this.syncStateChanged=c,this.excludesMetadataChanges=u,this.hasCachedResults=l}static fromInitialDocuments(e,t,r,i,s){const o=[];return t.forEach((c=>{o.push({type:0,doc:c})})),new Wr(e,t,br.emptySet(t),o,r,i,!0,!1,s)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(e){if(!(this.fromCache===e.fromCache&&this.hasCachedResults===e.hasCachedResults&&this.syncStateChanged===e.syncStateChanged&&this.mutatedKeys.isEqual(e.mutatedKeys)&&ya(this.query,e.query)&&this.docs.isEqual(e.docs)&&this.oldDocs.isEqual(e.oldDocs)))return!1;const t=this.docChanges,r=e.docChanges;if(t.length!==r.length)return!1;for(let i=0;i<t.length;i++)if(t[i].type!==r[i].type||!t[i].doc.isEqual(r[i].doc))return!1;return!0}}/**
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
 */class wA{constructor(){this.wa=void 0,this.ba=[]}Sa(){return this.ba.some((e=>e.Da()))}}class vA{constructor(){this.queries=Lf(),this.onlineState="Unknown",this.Ca=new Set}terminate(){(function(t,r){const i=L(t),s=i.queries;i.queries=Lf(),s.forEach(((o,c)=>{for(const u of c.ba)u.onError(r)}))})(this,new N(P.ABORTED,"Firestore shutting down"))}}function Lf(){return new Lt((n=>ig(n)),ya)}async function gl(n,e){const t=L(n);let r=3;const i=e.query;let s=t.queries.get(i);s?!s.Sa()&&e.Da()&&(r=2):(s=new wA,r=e.Da()?0:1);try{switch(r){case 0:s.wa=await t.onListen(i,!0);break;case 1:s.wa=await t.onListen(i,!1);break;case 2:await t.onFirstRemoteStoreListen(i)}}catch(o){const c=ml(o,`Initialization of query '${_r(e.query)}' failed`);return void e.onError(c)}t.queries.set(i,s),s.ba.push(e),e.va(t.onlineState),s.wa&&e.Fa(s.wa)&&yl(t)}async function _l(n,e){const t=L(n),r=e.query;let i=3;const s=t.queries.get(r);if(s){const o=s.ba.indexOf(e);o>=0&&(s.ba.splice(o,1),s.ba.length===0?i=e.Da()?0:1:!s.Sa()&&e.Da()&&(i=2))}switch(i){case 0:return t.queries.delete(r),t.onUnlisten(r,!0);case 1:return t.queries.delete(r),t.onUnlisten(r,!1);case 2:return t.onLastRemoteStoreUnlisten(r);default:return}}function AA(n,e){const t=L(n);let r=!1;for(const i of e){const s=i.query,o=t.queries.get(s);if(o){for(const c of o.ba)c.Fa(i)&&(r=!0);o.wa=i}}r&&yl(t)}function bA(n,e,t){const r=L(n),i=r.queries.get(e);if(i)for(const s of i.ba)s.onError(t);r.queries.delete(e)}function yl(n){n.Ca.forEach((e=>{e.next()}))}var gu,Ff;(Ff=gu||(gu={})).Ma="default",Ff.Cache="cache";class Il{constructor(e,t,r){this.query=e,this.xa=t,this.Oa=!1,this.Na=null,this.onlineState="Unknown",this.options=r||{}}Fa(e){if(!this.options.includeMetadataChanges){const r=[];for(const i of e.docChanges)i.type!==3&&r.push(i);e=new Wr(e.query,e.docs,e.oldDocs,r,e.mutatedKeys,e.fromCache,e.syncStateChanged,!0,e.hasCachedResults)}let t=!1;return this.Oa?this.Ba(e)&&(this.xa.next(e),t=!0):this.La(e,this.onlineState)&&(this.ka(e),t=!0),this.Na=e,t}onError(e){this.xa.error(e)}va(e){this.onlineState=e;let t=!1;return this.Na&&!this.Oa&&this.La(this.Na,e)&&(this.ka(this.Na),t=!0),t}La(e,t){if(!e.fromCache||!this.Da())return!0;const r=t!=="Offline";return(!this.options.Ka||!r)&&(!e.docs.isEmpty()||e.hasCachedResults||t==="Offline")}Ba(e){if(e.docChanges.length>0)return!0;const t=this.Na&&this.Na.hasPendingWrites!==e.hasPendingWrites;return!(!e.syncStateChanged&&!t)&&this.options.includeMetadataChanges===!0}ka(e){e=Wr.fromInitialDocuments(e.query,e.docs,e.mutatedKeys,e.fromCache,e.hasCachedResults),this.Oa=!0,this.xa.next(e)}Da(){return this.options.source!==gu.Cache}}/**
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
 */class m_{constructor(e){this.key=e}}class g_{constructor(e){this.key=e}}class RA{constructor(e,t){this.query=e,this.Za=t,this.Xa=null,this.hasCachedResults=!1,this.current=!1,this.Ya=W(),this.mutatedKeys=W(),this.eu=og(e),this.tu=new br(this.eu)}get nu(){return this.Za}ru(e,t){const r=t?t.iu:new Mf,i=t?t.tu:this.tu;let s=t?t.mutatedKeys:this.mutatedKeys,o=i,c=!1;const u=this.query.limitType==="F"&&i.size===this.query.limit?i.last():null,l=this.query.limitType==="L"&&i.size===this.query.limit?i.first():null;if(e.inorderTraversal(((f,p)=>{const g=i.get(f),A=Rs(this.query,p)?p:null,C=!!g&&this.mutatedKeys.has(g.key),V=!!A&&(A.hasLocalMutations||this.mutatedKeys.has(A.key)&&A.hasCommittedMutations);let D=!1;g&&A?g.data.isEqual(A.data)?C!==V&&(r.track({type:3,doc:A}),D=!0):this.su(g,A)||(r.track({type:2,doc:A}),D=!0,(u&&this.eu(A,u)>0||l&&this.eu(A,l)<0)&&(c=!0)):!g&&A?(r.track({type:0,doc:A}),D=!0):g&&!A&&(r.track({type:1,doc:g}),D=!0,(u||l)&&(c=!0)),D&&(A?(o=o.add(A),s=V?s.add(f):s.delete(f)):(o=o.delete(f),s=s.delete(f)))})),this.query.limit!==null)for(;o.size>this.query.limit;){const f=this.query.limitType==="F"?o.last():o.first();o=o.delete(f.key),s=s.delete(f.key),r.track({type:1,doc:f})}return{tu:o,iu:r,Ss:c,mutatedKeys:s}}su(e,t){return e.hasLocalMutations&&t.hasCommittedMutations&&!t.hasLocalMutations}applyChanges(e,t,r,i){const s=this.tu;this.tu=e.tu,this.mutatedKeys=e.mutatedKeys;const o=e.iu.ya();o.sort(((f,p)=>(function(A,C){const V=D=>{switch(D){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return M(20277,{Vt:D})}};return V(A)-V(C)})(f.type,p.type)||this.eu(f.doc,p.doc))),this.ou(r),i=i??!1;const c=t&&!i?this._u():[],u=this.Ya.size===0&&this.current&&!i?1:0,l=u!==this.Xa;return this.Xa=u,o.length!==0||l?{snapshot:new Wr(this.query,e.tu,s,o,e.mutatedKeys,u===0,l,!1,!!r&&r.resumeToken.approximateByteSize()>0),au:c}:{au:c}}va(e){return this.current&&e==="Offline"?(this.current=!1,this.applyChanges({tu:this.tu,iu:new Mf,mutatedKeys:this.mutatedKeys,Ss:!1},!1)):{au:[]}}uu(e){return!this.Za.has(e)&&!!this.tu.has(e)&&!this.tu.get(e).hasLocalMutations}ou(e){e&&(e.addedDocuments.forEach((t=>this.Za=this.Za.add(t))),e.modifiedDocuments.forEach((t=>{})),e.removedDocuments.forEach((t=>this.Za=this.Za.delete(t))),this.current=e.current)}_u(){if(!this.current)return[];const e=this.Ya;this.Ya=W(),this.tu.forEach((r=>{this.uu(r.key)&&(this.Ya=this.Ya.add(r.key))}));const t=[];return e.forEach((r=>{this.Ya.has(r)||t.push(new g_(r))})),this.Ya.forEach((r=>{e.has(r)||t.push(new m_(r))})),t}cu(e){this.Za=e.ks,this.Ya=W();const t=this.ru(e.documents);return this.applyChanges(t,!0)}lu(){return Wr.fromInitialDocuments(this.query,this.tu,this.mutatedKeys,this.Xa===0,this.hasCachedResults)}}const ii="SyncEngine";class SA{constructor(e,t,r){this.query=e,this.targetId=t,this.view=r}}class PA{constructor(e){this.key=e,this.hu=!1}}class CA{constructor(e,t,r,i,s,o){this.localStore=e,this.remoteStore=t,this.eventManager=r,this.sharedClientState=i,this.currentUser=s,this.maxConcurrentLimboResolutions=o,this.Pu={},this.Tu=new Lt((c=>ig(c)),ya),this.Iu=new Map,this.Eu=new Set,this.Ru=new se(x.comparator),this.Au=new Map,this.Vu=new il,this.du={},this.mu=new Map,this.fu=Yn.ar(),this.onlineState="Unknown",this.gu=void 0}get isPrimaryClient(){return this.gu===!0}}async function kA(n,e,t=!0){const r=Sa(n);let i;const s=r.Tu.get(e);return s?(r.sharedClientState.addLocalQueryTarget(s.targetId),i=s.view.lu()):i=await __(r,e,t,!0),i}async function DA(n,e){const t=Sa(n);await __(t,e,!0,!1)}async function __(n,e,t,r){const i=await zo(n.localStore,Ze(e)),s=i.targetId,o=n.sharedClientState.addLocalQueryTarget(s,t);let c;return r&&(c=await Tl(n,e,s,o==="current",i.resumeToken)),n.isPrimaryClient&&t&&Ra(n.remoteStore,i),c}async function Tl(n,e,t,r,i){n.pu=(p,g,A)=>(async function(V,D,j,q){let U=D.view.ru(j);U.Ss&&(U=await du(V.localStore,D.query,!1).then((({documents:T})=>D.view.ru(T,U))));const G=q&&q.targetChanges.get(D.targetId),Z=q&&q.targetMismatches.get(D.targetId)!=null,Q=D.view.applyChanges(U,V.isPrimaryClient,G,Z);return _u(V,D.targetId,Q.au),Q.snapshot})(n,p,g,A);const s=await du(n.localStore,e,!0),o=new RA(e,s.ks),c=o.ru(s.documents),u=Ps.createSynthesizedTargetChangeForCurrentChange(t,r&&n.onlineState!=="Offline",i),l=o.applyChanges(c,n.isPrimaryClient,u);_u(n,t,l.au);const f=new SA(e,t,o);return n.Tu.set(e,f),n.Iu.has(t)?n.Iu.get(t).push(e):n.Iu.set(t,[e]),l.snapshot}async function NA(n,e,t){const r=L(n),i=r.Tu.get(e),s=r.Iu.get(i.targetId);if(s.length>1)return r.Iu.set(i.targetId,s.filter((o=>!ya(o,e)))),void r.Tu.delete(e);r.isPrimaryClient?(r.sharedClientState.removeLocalQueryTarget(i.targetId),r.sharedClientState.isActiveQueryTarget(i.targetId)||await Kr(r.localStore,i.targetId,!1).then((()=>{r.sharedClientState.clearQueryState(i.targetId),t&&Hr(r.remoteStore,i.targetId),Qr(r,i.targetId)})).catch(In)):(Qr(r,i.targetId),await Kr(r.localStore,i.targetId,!0))}async function VA(n,e){const t=L(n),r=t.Tu.get(e),i=t.Iu.get(r.targetId);t.isPrimaryClient&&i.length===1&&(t.sharedClientState.removeLocalQueryTarget(r.targetId),Hr(t.remoteStore,r.targetId))}async function OA(n,e,t){const r=Al(n);try{const i=await(function(o,c){const u=L(o),l=te.now(),f=c.reduce(((A,C)=>A.add(C.key)),W());let p,g;return u.persistence.runTransaction("Locally write mutations","readwrite",(A=>{let C=Ye(),V=W();return u.xs.getEntries(A,f).next((D=>{C=D,C.forEach(((j,q)=>{q.isValidDocument()||(V=V.add(j))}))})).next((()=>u.localDocuments.getOverlayedDocuments(A,C))).next((D=>{p=D;const j=[];for(const q of c){const U=tv(q,p.get(q.key).overlayedDocument);U!=null&&j.push(new Ft(q.key,U,Wm(U.value.mapValue),ue.exists(!0)))}return u.mutationQueue.addMutationBatch(A,l,j,c)})).next((D=>{g=D;const j=D.applyToLocalDocumentSet(p,V);return u.documentOverlayCache.saveOverlays(A,D.batchId,j)}))})).then((()=>({batchId:g.batchId,changes:cg(p)})))})(r.localStore,e);r.sharedClientState.addPendingMutation(i.batchId),(function(o,c,u){let l=o.du[o.currentUser.toKey()];l||(l=new se(z)),l=l.insert(c,u),o.du[o.currentUser.toKey()]=l})(r,i.batchId,t),await wn(r,i.changes),await ni(r.remoteStore)}catch(i){const s=ml(i,"Failed to persist write");t.reject(s)}}async function y_(n,e){const t=L(n);try{const r=await Yv(t.localStore,e);e.targetChanges.forEach(((i,s)=>{const o=t.Au.get(s);o&&(F(i.addedDocuments.size+i.modifiedDocuments.size+i.removedDocuments.size<=1,22616),i.addedDocuments.size>0?o.hu=!0:i.modifiedDocuments.size>0?F(o.hu,14607):i.removedDocuments.size>0&&(F(o.hu,42227),o.hu=!1))})),await wn(t,r,e)}catch(r){await In(r)}}function Uf(n,e,t){const r=L(n);if(r.isPrimaryClient&&t===0||!r.isPrimaryClient&&t===1){const i=[];r.Tu.forEach(((s,o)=>{const c=o.view.va(e);c.snapshot&&i.push(c.snapshot)})),(function(o,c){const u=L(o);u.onlineState=c;let l=!1;u.queries.forEach(((f,p)=>{for(const g of p.ba)g.va(c)&&(l=!0)})),l&&yl(u)})(r.eventManager,e),i.length&&r.Pu.J_(i),r.onlineState=e,r.isPrimaryClient&&r.sharedClientState.setOnlineState(e)}}async function xA(n,e,t){const r=L(n);r.sharedClientState.updateQueryState(e,"rejected",t);const i=r.Au.get(e),s=i&&i.key;if(s){let o=new se(x.comparator);o=o.insert(s,ce.newNoDocument(s,B.min()));const c=W().add(s),u=new Ss(B.min(),new Map,new se(z),o,c);await y_(r,u),r.Ru=r.Ru.remove(s),r.Au.delete(e),vl(r)}else await Kr(r.localStore,e,!1).then((()=>Qr(r,e,t))).catch(In)}async function MA(n,e){const t=L(n),r=e.batch.batchId;try{const i=await Jv(t.localStore,e);wl(t,r,null),El(t,r),t.sharedClientState.updateMutationState(r,"acknowledged"),await wn(t,i)}catch(i){await In(i)}}async function LA(n,e,t){const r=L(n);try{const i=await(function(o,c){const u=L(o);return u.persistence.runTransaction("Reject batch","readwrite-primary",(l=>{let f;return u.mutationQueue.lookupMutationBatch(l,c).next((p=>(F(p!==null,37113),f=p.keys(),u.mutationQueue.removeMutationBatch(l,p)))).next((()=>u.mutationQueue.performConsistencyCheck(l))).next((()=>u.documentOverlayCache.removeOverlaysForBatchId(l,f,c))).next((()=>u.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(l,f))).next((()=>u.localDocuments.getDocuments(l,f)))}))})(r.localStore,e);wl(r,e,t),El(r,e),r.sharedClientState.updateMutationState(e,"rejected",t),await wn(r,i)}catch(i){await In(i)}}function El(n,e){(n.mu.get(e)||[]).forEach((t=>{t.resolve()})),n.mu.delete(e)}function wl(n,e,t){const r=L(n);let i=r.du[r.currentUser.toKey()];if(i){const s=i.get(e);s&&(t?s.reject(t):s.resolve(),i=i.remove(e)),r.du[r.currentUser.toKey()]=i}}function Qr(n,e,t=null){n.sharedClientState.removeLocalQueryTarget(e);for(const r of n.Iu.get(e))n.Tu.delete(r),t&&n.Pu.yu(r,t);n.Iu.delete(e),n.isPrimaryClient&&n.Vu.Gr(e).forEach((r=>{n.Vu.containsKey(r)||I_(n,r)}))}function I_(n,e){n.Eu.delete(e.path.canonicalString());const t=n.Ru.get(e);t!==null&&(Hr(n.remoteStore,t),n.Ru=n.Ru.remove(e),n.Au.delete(t),vl(n))}function _u(n,e,t){for(const r of t)r instanceof m_?(n.Vu.addReference(r.key,e),FA(n,r)):r instanceof g_?(k(ii,"Document no longer in limbo: "+r.key),n.Vu.removeReference(r.key,e),n.Vu.containsKey(r.key)||I_(n,r.key)):M(19791,{wu:r})}function FA(n,e){const t=e.key,r=t.path.canonicalString();n.Ru.get(t)||n.Eu.has(r)||(k(ii,"New document in limbo: "+t),n.Eu.add(r),vl(n))}function vl(n){for(;n.Eu.size>0&&n.Ru.size<n.maxConcurrentLimboResolutions;){const e=n.Eu.values().next().value;n.Eu.delete(e);const t=new x(ee.fromString(e)),r=n.fu.next();n.Au.set(r,new PA(t)),n.Ru=n.Ru.insert(t,r),Ra(n.remoteStore,new St(Ze(bs(t.path)),r,"TargetPurposeLimboResolution",je.ce))}}async function wn(n,e,t){const r=L(n),i=[],s=[],o=[];r.Tu.isEmpty()||(r.Tu.forEach(((c,u)=>{o.push(r.pu(u,e,t).then((l=>{if((l||t)&&r.isPrimaryClient){const f=l?!l.fromCache:t?.targetChanges.get(u.targetId)?.current;r.sharedClientState.updateQueryState(u.targetId,f?"current":"not-current")}if(l){i.push(l);const f=al.Es(u.targetId,l);s.push(f)}})))})),await Promise.all(o),r.Pu.J_(i),await(async function(u,l){const f=L(u);try{await f.persistence.runTransaction("notifyLocalViewChanges","readwrite",(p=>v.forEach(l,(g=>v.forEach(g.Ts,(A=>f.persistence.referenceDelegate.addReference(p,g.targetId,A))).next((()=>v.forEach(g.Is,(A=>f.persistence.referenceDelegate.removeReference(p,g.targetId,A)))))))))}catch(p){if(!Tn(p))throw p;k(cl,"Failed to update sequence numbers: "+p)}for(const p of l){const g=p.targetId;if(!p.fromCache){const A=f.vs.get(g),C=A.snapshotVersion,V=A.withLastLimboFreeSnapshotVersion(C);f.vs=f.vs.insert(g,V)}}})(r.localStore,s))}async function UA(n,e){const t=L(n);if(!t.currentUser.isEqual(e)){k(ii,"User change. New user:",e.toKey());const r=await Zg(t.localStore,e);t.currentUser=e,(function(s,o){s.mu.forEach((c=>{c.forEach((u=>{u.reject(new N(P.CANCELLED,o))}))})),s.mu.clear()})(t,"'waitForPendingWrites' promise is rejected due to a user change."),t.sharedClientState.handleUserChange(e,r.removedBatchIds,r.addedBatchIds),await wn(t,r.Ns)}}function BA(n,e){const t=L(n),r=t.Au.get(e);if(r&&r.hu)return W().add(r.key);{let i=W();const s=t.Iu.get(e);if(!s)return i;for(const o of s){const c=t.Tu.get(o);i=i.unionWith(c.view.nu)}return i}}async function $A(n,e){const t=L(n),r=await du(t.localStore,e.query,!0),i=e.view.cu(r);return t.isPrimaryClient&&_u(t,e.targetId,i.au),i}async function qA(n,e){const t=L(n);return n_(t.localStore,e).then((r=>wn(t,r)))}async function jA(n,e,t,r){const i=L(n),s=await(function(c,u){const l=L(c),f=L(l.mutationQueue);return l.persistence.runTransaction("Lookup mutation documents","readonly",(p=>f.Xn(p,u).next((g=>g?l.localDocuments.getDocuments(p,g):v.resolve(null)))))})(i.localStore,e);s!==null?(t==="pending"?await ni(i.remoteStore):t==="acknowledged"||t==="rejected"?(wl(i,e,r||null),El(i,e),(function(c,u){L(L(c).mutationQueue).nr(u)})(i.localStore,e)):M(6720,"Unknown batchState",{bu:t}),await wn(i,s)):k(ii,"Cannot apply mutation batch with id: "+e)}async function zA(n,e){const t=L(n);if(Sa(t),Al(t),e===!0&&t.gu!==!0){const r=t.sharedClientState.getAllActiveQueryTargets(),i=await Bf(t,r.toArray());t.gu=!0,await mu(t.remoteStore,!0);for(const s of i)Ra(t.remoteStore,s)}else if(e===!1&&t.gu!==!1){const r=[];let i=Promise.resolve();t.Iu.forEach(((s,o)=>{t.sharedClientState.isLocalQueryTarget(o)?r.push(o):i=i.then((()=>(Qr(t,o),Kr(t.localStore,o,!0)))),Hr(t.remoteStore,o)})),await i,await Bf(t,r),(function(o){const c=L(o);c.Au.forEach(((u,l)=>{Hr(c.remoteStore,l)})),c.Vu.zr(),c.Au=new Map,c.Ru=new se(x.comparator)})(t),t.gu=!1,await mu(t.remoteStore,!1)}}async function Bf(n,e,t){const r=L(n),i=[],s=[];for(const o of e){let c;const u=r.Iu.get(o);if(u&&u.length!==0){c=await zo(r.localStore,Ze(u[0]));for(const l of u){const f=r.Tu.get(l),p=await $A(r,f);p.snapshot&&s.push(p.snapshot)}}else{const l=await t_(r.localStore,o);c=await zo(r.localStore,l),await Tl(r,T_(l),o,!1,c.resumeToken)}i.push(c)}return r.Pu.J_(s),i}function T_(n){return ng(n.path,n.collectionGroup,n.orderBy,n.filters,n.limit,"F",n.startAt,n.endAt)}function GA(n){return(function(t){return L(L(t).persistence).hs()})(L(n).localStore)}async function KA(n,e,t,r){const i=L(n);if(i.gu)return void k(ii,"Ignoring unexpected query state notification.");const s=i.Iu.get(e);if(s&&s.length>0)switch(t){case"current":case"not-current":{const o=await n_(i.localStore,sg(s[0])),c=Ss.createSynthesizedRemoteEventForCurrentChange(e,t==="current",ge.EMPTY_BYTE_STRING);await wn(i,o,c);break}case"rejected":await Kr(i.localStore,e,!0),Qr(i,e,r);break;default:M(64155,t)}}async function HA(n,e,t){const r=Sa(n);if(r.gu){for(const i of e){if(r.Iu.has(i)&&r.sharedClientState.isActiveQueryTarget(i)){k(ii,"Adding an already active target "+i);continue}const s=await t_(r.localStore,i),o=await zo(r.localStore,s);await Tl(r,T_(s),o.targetId,!1,o.resumeToken),Ra(r.remoteStore,o)}for(const i of t)r.Iu.has(i)&&await Kr(r.localStore,i,!1).then((()=>{Hr(r.remoteStore,i),Qr(r,i)})).catch(In)}}function Sa(n){const e=L(n);return e.remoteStore.remoteSyncer.applyRemoteEvent=y_.bind(null,e),e.remoteStore.remoteSyncer.getRemoteKeysForTarget=BA.bind(null,e),e.remoteStore.remoteSyncer.rejectListen=xA.bind(null,e),e.Pu.J_=AA.bind(null,e.eventManager),e.Pu.yu=bA.bind(null,e.eventManager),e}function Al(n){const e=L(n);return e.remoteStore.remoteSyncer.applySuccessfulWrite=MA.bind(null,e),e.remoteStore.remoteSyncer.rejectFailedWrite=LA.bind(null,e),e}class fs{constructor(){this.kind="memory",this.synchronizeTabs=!1}async initialize(e){this.serializer=Aa(e.databaseInfo.databaseId),this.sharedClientState=this.Du(e),this.persistence=this.Cu(e),await this.persistence.start(),this.localStore=this.vu(e),this.gcScheduler=this.Fu(e,this.localStore),this.indexBackfillerScheduler=this.Mu(e,this.localStore)}Fu(e,t){return null}Mu(e,t){return null}vu(e){return Xg(this.persistence,new Yg,e.initialUser,this.serializer)}Cu(e){return new sl(va.Vi,this.serializer)}Du(e){return new a_}async terminate(){this.gcScheduler?.stop(),this.indexBackfillerScheduler?.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}fs.provider={build:()=>new fs};class WA extends fs{constructor(e){super(),this.cacheSizeBytes=e}Fu(e,t){F(this.persistence.referenceDelegate instanceof jo,46915);const r=this.persistence.referenceDelegate.garbageCollector;return new Gg(r,e.asyncQueue,t)}Cu(e){const t=this.cacheSizeBytes!==void 0?Ne.withCacheSize(this.cacheSizeBytes):Ne.DEFAULT;return new sl((r=>jo.Vi(r,t)),this.serializer)}}class E_ extends fs{constructor(e,t,r){super(),this.xu=e,this.cacheSizeBytes=t,this.forceOwnership=r,this.kind="persistent",this.synchronizeTabs=!1}async initialize(e){await super.initialize(e),await this.xu.initialize(this,e),await Al(this.xu.syncEngine),await ni(this.xu.remoteStore),await this.persistence.zi((()=>(this.gcScheduler&&!this.gcScheduler.started&&this.gcScheduler.start(),this.indexBackfillerScheduler&&!this.indexBackfillerScheduler.started&&this.indexBackfillerScheduler.start(),Promise.resolve())))}vu(e){return Xg(this.persistence,new Yg,e.initialUser,this.serializer)}Fu(e,t){const r=this.persistence.referenceDelegate.garbageCollector;return new Gg(r,e.asyncQueue,t)}Mu(e,t){const r=new nw(t,this.persistence);return new tw(e.asyncQueue,r)}Cu(e){const t=Jg(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey),r=this.cacheSizeBytes!==void 0?Ne.withCacheSize(this.cacheSizeBytes):Ne.DEFAULT;return new ol(this.synchronizeTabs,t,e.clientId,r,e.asyncQueue,c_(),vo(),this.serializer,this.sharedClientState,!!this.forceOwnership)}Du(e){return new a_}}class QA extends E_{constructor(e,t){super(e,t,!1),this.xu=e,this.cacheSizeBytes=t,this.synchronizeTabs=!0}async initialize(e){await super.initialize(e);const t=this.xu.syncEngine;this.sharedClientState instanceof vc&&(this.sharedClientState.syncEngine={So:jA.bind(null,t),Do:KA.bind(null,t),Co:HA.bind(null,t),hs:GA.bind(null,t),bo:qA.bind(null,t)},await this.sharedClientState.start()),await this.persistence.zi((async r=>{await zA(this.xu.syncEngine,r),this.gcScheduler&&(r&&!this.gcScheduler.started?this.gcScheduler.start():r||this.gcScheduler.stop()),this.indexBackfillerScheduler&&(r&&!this.indexBackfillerScheduler.started?this.indexBackfillerScheduler.start():r||this.indexBackfillerScheduler.stop())}))}Du(e){const t=c_();if(!vc.v(t))throw new N(P.UNIMPLEMENTED,"IndexedDB persistence is only available on platforms that support LocalStorage.");const r=Jg(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey);return new vc(t,e.asyncQueue,r,e.clientId,e.initialUser)}}class ps{async initialize(e,t){this.localStore||(this.localStore=e.localStore,this.sharedClientState=e.sharedClientState,this.datastore=this.createDatastore(t),this.remoteStore=this.createRemoteStore(t),this.eventManager=this.createEventManager(t),this.syncEngine=this.createSyncEngine(t,!e.synchronizeTabs),this.sharedClientState.onlineStateHandler=r=>Uf(this.syncEngine,r,1),this.remoteStore.remoteSyncer.handleCredentialChange=UA.bind(null,this.syncEngine),await mu(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(e){return(function(){return new vA})()}createDatastore(e){const t=Aa(e.databaseInfo.databaseId),r=iA(e.databaseInfo);return uA(e.authCredentials,e.appCheckCredentials,r,t)}createRemoteStore(e){return(function(r,i,s,o,c){return new hA(r,i,s,o,c)})(this.localStore,this.datastore,e.asyncQueue,(t=>Uf(this.syncEngine,t,0)),(function(){return Vf.v()?new Vf:new eA})())}createSyncEngine(e,t){return(function(i,s,o,c,u,l,f){const p=new CA(i,s,o,c,u,l);return f&&(p.gu=!0),p})(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,e.initialUser,e.maxConcurrentLimboResolutions,t)}async terminate(){await(async function(t){const r=L(t);k(Xn,"RemoteStore shutting down."),r.Ea.add(5),await Cs(r),r.Aa.shutdown(),r.Va.set("Unknown")})(this.remoteStore),this.datastore?.terminate(),this.eventManager?.terminate()}}ps.provider={build:()=>new ps};/**
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
 */class bl{constructor(e){this.observer=e,this.muted=!1}next(e){this.muted||this.observer.next&&this.Ou(this.observer.next,e)}error(e){this.muted||(this.observer.error?this.Ou(this.observer.error,e):me("Uncaught Error in snapshot listener:",e.toString()))}Nu(){this.muted=!0}Ou(e,t){setTimeout((()=>{this.muted||e(t)}),0)}}/**
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
 */let JA=class{constructor(e){this.datastore=e,this.readVersions=new Map,this.mutations=[],this.committed=!1,this.lastTransactionError=null,this.writtenDocs=new Set}async lookup(e){if(this.ensureCommitNotCalled(),this.mutations.length>0)throw this.lastTransactionError=new N(P.INVALID_ARGUMENT,"Firestore transactions require all reads to be executed before all writes."),this.lastTransactionError;const t=await(async function(i,s){const o=L(i),c={documents:s.map((p=>hs(o.serializer,p)))},u=await o.jo("BatchGetDocuments",o.serializer.databaseId,ee.emptyPath(),c,s.length),l=new Map;u.forEach((p=>{const g=dv(o.serializer,p);l.set(g.key.toString(),g)}));const f=[];return s.forEach((p=>{const g=l.get(p.toString());F(!!g,55234,{key:p}),f.push(g)})),f})(this.datastore,e);return t.forEach((r=>this.recordVersion(r))),t}set(e,t){this.write(t.toMutation(e,this.precondition(e))),this.writtenDocs.add(e.toString())}update(e,t){try{this.write(t.toMutation(e,this.preconditionForUpdate(e)))}catch(r){this.lastTransactionError=r}this.writtenDocs.add(e.toString())}delete(e){this.write(new ti(e,this.precondition(e))),this.writtenDocs.add(e.toString())}async commit(){if(this.ensureCommitNotCalled(),this.lastTransactionError)throw this.lastTransactionError;const e=this.readVersions;this.mutations.forEach((t=>{e.delete(t.key.toString())})),e.forEach(((t,r)=>{const i=x.fromPath(r);this.mutations.push(new Ju(i,this.precondition(i)))})),await(async function(r,i){const s=L(r),o={writes:i.map((c=>ds(s.serializer,c)))};await s.Wo("Commit",s.serializer.databaseId,ee.emptyPath(),o)})(this.datastore,this.mutations),this.committed=!0}recordVersion(e){let t;if(e.isFoundDocument())t=e.version;else{if(!e.isNoDocument())throw M(50498,{Gu:e.constructor.name});t=B.min()}const r=this.readVersions.get(e.key.toString());if(r){if(!t.isEqual(r))throw new N(P.ABORTED,"Document version changed between two reads.")}else this.readVersions.set(e.key.toString(),t)}precondition(e){const t=this.readVersions.get(e.toString());return!this.writtenDocs.has(e.toString())&&t?t.isEqual(B.min())?ue.exists(!1):ue.updateTime(t):ue.none()}preconditionForUpdate(e){const t=this.readVersions.get(e.toString());if(!this.writtenDocs.has(e.toString())&&t){if(t.isEqual(B.min()))throw new N(P.INVALID_ARGUMENT,"Can't update a document that doesn't exist.");return ue.updateTime(t)}return ue.exists(!0)}write(e){this.ensureCommitNotCalled(),this.mutations.push(e)}ensureCommitNotCalled(){}};/**
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
 */class YA{constructor(e,t,r,i,s){this.asyncQueue=e,this.datastore=t,this.options=r,this.updateFunction=i,this.deferred=s,this.zu=r.maxAttempts,this.M_=new ll(this.asyncQueue,"transaction_retry")}ju(){this.zu-=1,this.Hu()}Hu(){this.M_.p_((async()=>{const e=new JA(this.datastore),t=this.Ju(e);t&&t.then((r=>{this.asyncQueue.enqueueAndForget((()=>e.commit().then((()=>{this.deferred.resolve(r)})).catch((i=>{this.Zu(i)}))))})).catch((r=>{this.Zu(r)}))}))}Ju(e){try{const t=this.updateFunction(e);return!ws(t)&&t.catch&&t.then?t:(this.deferred.reject(Error("Transaction callback must return a Promise")),null)}catch(t){return this.deferred.reject(t),null}}Zu(e){this.zu>0&&this.Xu(e)?(this.zu-=1,this.asyncQueue.enqueueAndForget((()=>(this.Hu(),Promise.resolve())))):this.deferred.reject(e)}Xu(e){if(e?.name==="FirebaseError"){const t=e.code;return t==="aborted"||t==="failed-precondition"||t==="already-exists"||!Ig(t)}return!1}}/**
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
 */const mn="FirestoreClient";class XA{constructor(e,t,r,i,s){this.authCredentials=e,this.appCheckCredentials=t,this.asyncQueue=r,this._databaseInfo=i,this.user=De.UNAUTHENTICATED,this.clientId=Lu.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=s,this.authCredentials.start(r,(async o=>{k(mn,"Received user=",o.uid),await this.authCredentialListener(o),this.user=o})),this.appCheckCredentials.start(r,(o=>(k(mn,"Received new app check token=",o),this.appCheckCredentialListener(o,this.user))))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this._databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(e){this.authCredentialListener=e}setAppCheckTokenChangeListener(e){this.appCheckCredentialListener=e}terminate(){this.asyncQueue.enterRestrictedMode();const e=new lt;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted((async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),e.resolve()}catch(t){const r=ml(t,"Failed to shutdown persistence");e.reject(r)}})),e.promise}}async function bc(n,e){n.asyncQueue.verifyOperationInProgress(),k(mn,"Initializing OfflineComponentProvider");const t=n.configuration;await e.initialize(t);let r=t.initialUser;n.setCredentialChangeListener((async i=>{r.isEqual(i)||(await Zg(e.localStore,i),r=i)})),e.persistence.setDatabaseDeletedListener((()=>n.terminate())),n._offlineComponents=e}async function $f(n,e){n.asyncQueue.verifyOperationInProgress();const t=await ZA(n);k(mn,"Initializing OnlineComponentProvider"),await e.initialize(t,n.configuration),n.setCredentialChangeListener((r=>xf(e.remoteStore,r))),n.setAppCheckTokenChangeListener(((r,i)=>xf(e.remoteStore,i))),n._onlineComponents=e}async function ZA(n){if(!n._offlineComponents)if(n._uninitializedComponentsProvider){k(mn,"Using user provided OfflineComponentProvider");try{await bc(n,n._uninitializedComponentsProvider._offline)}catch(e){const t=e;if(!(function(i){return i.name==="FirebaseError"?i.code===P.FAILED_PRECONDITION||i.code===P.UNIMPLEMENTED:!(typeof DOMException<"u"&&i instanceof DOMException)||i.code===22||i.code===20||i.code===11})(t))throw t;Dr("Error using user provided cache. Falling back to memory cache: "+t),await bc(n,new fs)}}else k(mn,"Using default OfflineComponentProvider"),await bc(n,new WA(void 0));return n._offlineComponents}async function Rl(n){return n._onlineComponents||(n._uninitializedComponentsProvider?(k(mn,"Using user provided OnlineComponentProvider"),await $f(n,n._uninitializedComponentsProvider._online)):(k(mn,"Using default OnlineComponentProvider"),await $f(n,new ps))),n._onlineComponents}function eb(n){return Rl(n).then((e=>e.syncEngine))}function tb(n){return Rl(n).then((e=>e.datastore))}async function Wo(n){const e=await Rl(n),t=e.eventManager;return t.onListen=kA.bind(null,e.syncEngine),t.onUnlisten=NA.bind(null,e.syncEngine),t.onFirstRemoteStoreListen=DA.bind(null,e.syncEngine),t.onLastRemoteStoreUnlisten=VA.bind(null,e.syncEngine),t}function nb(n,e,t,r){const i=new bl(r),s=new Il(e,i,t);return n.asyncQueue.enqueueAndForget((async()=>gl(await Wo(n),s))),()=>{i.Nu(),n.asyncQueue.enqueueAndForget((async()=>_l(await Wo(n),s)))}}function rb(n,e,t={}){const r=new lt;return n.asyncQueue.enqueueAndForget((async()=>(function(s,o,c,u,l){const f=new bl({next:g=>{f.Nu(),o.enqueueAndForget((()=>_l(s,p)));const A=g.docs.has(c);!A&&g.fromCache?l.reject(new N(P.UNAVAILABLE,"Failed to get document because the client is offline.")):A&&g.fromCache&&u&&u.source==="server"?l.reject(new N(P.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):l.resolve(g)},error:g=>l.reject(g)}),p=new Il(bs(c.path),f,{includeMetadataChanges:!0,Ka:!0});return gl(s,p)})(await Wo(n),n.asyncQueue,e,t,r))),r.promise}function ib(n,e,t={}){const r=new lt;return n.asyncQueue.enqueueAndForget((async()=>(function(s,o,c,u,l){const f=new bl({next:g=>{f.Nu(),o.enqueueAndForget((()=>_l(s,p))),g.fromCache&&u.source==="server"?l.reject(new N(P.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):l.resolve(g)},error:g=>l.reject(g)}),p=new Il(c,f,{includeMetadataChanges:!0,Ka:!0});return gl(s,p)})(await Wo(n),n.asyncQueue,e,t,r))),r.promise}function sb(n,e){const t=new lt;return n.asyncQueue.enqueueAndForget((async()=>OA(await eb(n),e,t))),t.promise}function ob(n,e,t){const r=new lt;return n.asyncQueue.enqueueAndForget((async()=>{const i=await tb(n);new YA(n.asyncQueue,i,t,e,r).ju()})),r.promise}/**
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
 */function w_(n){const e={};return n.timeoutSeconds!==void 0&&(e.timeoutSeconds=n.timeoutSeconds),e}/**
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
 */const ab="ComponentProvider",qf=new Map;function cb(n,e,t,r,i){return new kw(n,e,t,i.host,i.ssl,i.experimentalForceLongPolling,i.experimentalAutoDetectLongPolling,w_(i.experimentalLongPollingOptions),i.useFetchStreams,i.isUsingEmulator,r)}/**
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
 */const ub="firestore.googleapis.com",jf=!0;class zf{constructor(e){if(e.host===void 0){if(e.ssl!==void 0)throw new N(P.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host=ub,this.ssl=jf}else this.host=e.host,this.ssl=e.ssl??jf;if(this.isUsingEmulator=e.emulatorOptions!==void 0,this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e.cacheSizeBytes===void 0)this.cacheSizeBytes=Bg;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<zg)throw new N(P.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}XE("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=w_(e.experimentalLongPollingOptions??{}),(function(r){if(r.timeoutSeconds!==void 0){if(isNaN(r.timeoutSeconds))throw new N(P.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (must not be NaN)`);if(r.timeoutSeconds<5)throw new N(P.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (minimum allowed value is 5)`);if(r.timeoutSeconds>30)throw new N(P.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (maximum allowed value is 30)`)}})(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&(function(r,i){return r.timeoutSeconds===i.timeoutSeconds})(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams}}class Sl{constructor(e,t,r,i){this._authCredentials=e,this._appCheckCredentials=t,this._databaseId=r,this._app=i,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new zf({}),this._settingsFrozen=!1,this._emulatorOptions={},this._terminateTask="notTerminated"}get app(){if(!this._app)throw new N(P.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(e){if(this._settingsFrozen)throw new N(P.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new zf(e),this._emulatorOptions=e.emulatorOptions||{},e.credentials!==void 0&&(this._authCredentials=(function(r){if(!r)return new jE;switch(r.type){case"firstParty":return new KE(r.sessionIndex||"0",r.iamToken||null,r.authTokenFactory||null);case"provider":return r.client;default:throw new N(P.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}})(e.credentials))}_getSettings(){return this._settings}_getEmulatorOptions(){return this._emulatorOptions}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return(function(t){const r=qf.get(t);r&&(k(ab,"Removing Datastore"),qf.delete(t),r.terminate())})(this),Promise.resolve()}}/**
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
 */class vn{constructor(e,t,r){this.converter=t,this._query=r,this.type="query",this.firestore=e}withConverter(e){return new vn(this.firestore,e,this._query)}}class he{constructor(e,t,r){this.converter=t,this._key=r,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new un(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new he(this.firestore,e,this._key)}toJSON(){return{type:he._jsonSchemaVersion,referencePath:this._key.toString()}}static fromJSON(e,t,r){if(Es(t,he._jsonSchema))return new he(e,r||null,new x(ee.fromString(t.referencePath)))}}he._jsonSchemaVersion="firestore/documentReference/1.0",he._jsonSchema={type:ye("string",he._jsonSchemaVersion),referencePath:ye("string")};class un extends vn{constructor(e,t,r){super(e,t,bs(r)),this._path=r,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const e=this._path.popLast();return e.isEmpty()?null:new he(this.firestore,null,new x(e))}withConverter(e){return new un(this.firestore,e,this._path)}}function lD(n,e,...t){if(n=K(n),Em("collection","path",e),n instanceof Sl){const r=ee.fromString(e,...t);return Vd(r),new un(n,null,r)}{if(!(n instanceof he||n instanceof un))throw new N(P.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const r=n._path.child(ee.fromString(e,...t));return Vd(r),new un(n.firestore,null,r)}}function lb(n,e,...t){if(n=K(n),arguments.length===1&&(e=Lu.newId()),Em("doc","path",e),n instanceof Sl){const r=ee.fromString(e,...t);return Nd(r),new he(n,null,new x(r))}{if(!(n instanceof he||n instanceof un))throw new N(P.INVALID_ARGUMENT,"Expected first argument to doc() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const r=n._path.child(ee.fromString(e,...t));return Nd(r),new he(n.firestore,n instanceof un?n.converter:null,new x(r))}}/**
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
 */const Gf="AsyncQueue";class Kf{constructor(e=Promise.resolve()){this.Yu=[],this.ec=!1,this.tc=[],this.nc=null,this.rc=!1,this.sc=!1,this.oc=[],this.M_=new ll(this,"async_queue_retry"),this._c=()=>{const r=vo();r&&k(Gf,"Visibility state changed to "+r.visibilityState),this.M_.w_()},this.ac=e;const t=vo();t&&typeof t.addEventListener=="function"&&t.addEventListener("visibilitychange",this._c)}get isShuttingDown(){return this.ec}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.uc(),this.cc(e)}enterRestrictedMode(e){if(!this.ec){this.ec=!0,this.sc=e||!1;const t=vo();t&&typeof t.removeEventListener=="function"&&t.removeEventListener("visibilitychange",this._c)}}enqueue(e){if(this.uc(),this.ec)return new Promise((()=>{}));const t=new lt;return this.cc((()=>this.ec&&this.sc?Promise.resolve():(e().then(t.resolve,t.reject),t.promise))).then((()=>t.promise))}enqueueRetryable(e){this.enqueueAndForget((()=>(this.Yu.push(e),this.lc())))}async lc(){if(this.Yu.length!==0){try{await this.Yu[0](),this.Yu.shift(),this.M_.reset()}catch(e){if(!Tn(e))throw e;k(Gf,"Operation failed with retryable error: "+e)}this.Yu.length>0&&this.M_.p_((()=>this.lc()))}}cc(e){const t=this.ac.then((()=>(this.rc=!0,e().catch((r=>{throw this.nc=r,this.rc=!1,me("INTERNAL UNHANDLED ERROR: ",Hf(r)),r})).then((r=>(this.rc=!1,r))))));return this.ac=t,t}enqueueAfterDelay(e,t,r){this.uc(),this.oc.indexOf(e)>-1&&(t=0);const i=pl.createAndSchedule(this,e,t,r,(s=>this.hc(s)));return this.tc.push(i),i}uc(){this.nc&&M(47125,{Pc:Hf(this.nc)})}verifyOperationInProgress(){}async Tc(){let e;do e=this.ac,await e;while(e!==this.ac)}Ic(e){for(const t of this.tc)if(t.timerId===e)return!0;return!1}Ec(e){return this.Tc().then((()=>{this.tc.sort(((t,r)=>t.targetTimeMs-r.targetTimeMs));for(const t of this.tc)if(t.skipDelay(),e!=="all"&&t.timerId===e)break;return this.Tc()}))}Rc(e){this.oc.push(e)}hc(e){const t=this.tc.indexOf(e);this.tc.splice(t,1)}}function Hf(n){let e=n.message||"";return n.stack&&(e=n.stack.includes(n.message)?n.stack:n.message+`
`+n.stack),e}class dt extends Sl{constructor(e,t,r,i){super(e,t,r,i),this.type="firestore",this._queue=new Kf,this._persistenceKey=i?.name||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const e=this._firestoreClient.terminate();this._queue=new Kf(e),this._firestoreClient=void 0,await e}}}function hD(n,e,t){t||(t=Lo);const r=Rt(n,"firestore");if(r.isInitialized(t)){const i=r.getImmediate({identifier:t}),s=r.getOptions(t);if(hn(s,e))return i;throw new N(P.FAILED_PRECONDITION,"initializeFirestore() has already been called with different options. To avoid this error, call initializeFirestore() with the same options as when it was originally called, or call getFirestore() to return the already initialized instance.")}if(e.cacheSizeBytes!==void 0&&e.localCache!==void 0)throw new N(P.INVALID_ARGUMENT,"cache and cacheSizeBytes cannot be specified at the same time as cacheSizeBytes willbe deprecated. Instead, specify the cache size in the cache object");if(e.cacheSizeBytes!==void 0&&e.cacheSizeBytes!==-1&&e.cacheSizeBytes<zg)throw new N(P.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");return e.host&&bt(e.host)&&ua(e.host),r.initialize({options:e,instanceIdentifier:t})}function si(n){if(n._terminated)throw new N(P.FAILED_PRECONDITION,"The client has already been terminated.");return n._firestoreClient||hb(n),n._firestoreClient}function hb(n){const e=n._freezeSettings(),t=cb(n._databaseId,n._app?.options.appId||"",n._persistenceKey,n._app?.options.apiKey,e);n._componentsProvider||e.localCache?._offlineComponentProvider&&e.localCache?._onlineComponentProvider&&(n._componentsProvider={_offline:e.localCache._offlineComponentProvider,_online:e.localCache._onlineComponentProvider}),n._firestoreClient=new XA(n._authCredentials,n._appCheckCredentials,n._queue,t,n._componentsProvider&&(function(i){const s=i?._online.build();return{_offline:i?._offline.build(s),_online:s}})(n._componentsProvider))}/**
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
 */class Je{constructor(e){this._byteString=e}static fromBase64String(e){try{return new Je(ge.fromBase64String(e))}catch(t){throw new N(P.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+t)}}static fromUint8Array(e){return new Je(ge.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}toJSON(){return{type:Je._jsonSchemaVersion,bytes:this.toBase64()}}static fromJSON(e){if(Es(e,Je._jsonSchema))return Je.fromBase64String(e.bytes)}}Je._jsonSchemaVersion="firestore/bytes/1.0",Je._jsonSchema={type:ye("string",Je._jsonSchemaVersion),bytes:ye("string")};/**
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
 */class ks{constructor(...e){for(let t=0;t<e.length;++t)if(e[t].length===0)throw new N(P.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new le(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}}/**
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
 */class Pa{constructor(e){this._methodName=e}}/**
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
 */class Et{constructor(e,t){if(!isFinite(e)||e<-90||e>90)throw new N(P.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(t)||t<-180||t>180)throw new N(P.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+t);this._lat=e,this._long=t}get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}_compareTo(e){return z(this._lat,e._lat)||z(this._long,e._long)}toJSON(){return{latitude:this._lat,longitude:this._long,type:Et._jsonSchemaVersion}}static fromJSON(e){if(Es(e,Et._jsonSchema))return new Et(e.latitude,e.longitude)}}Et._jsonSchemaVersion="firestore/geoPoint/1.0",Et._jsonSchema={type:ye("string",Et._jsonSchemaVersion),latitude:ye("number"),longitude:ye("number")};/**
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
 */class ht{constructor(e){this._values=(e||[]).map((t=>t))}toArray(){return this._values.map((e=>e))}isEqual(e){return(function(r,i){if(r.length!==i.length)return!1;for(let s=0;s<r.length;++s)if(r[s]!==i[s])return!1;return!0})(this._values,e._values)}toJSON(){return{type:ht._jsonSchemaVersion,vectorValues:this._values}}static fromJSON(e){if(Es(e,ht._jsonSchema)){if(Array.isArray(e.vectorValues)&&e.vectorValues.every((t=>typeof t=="number")))return new ht(e.vectorValues);throw new N(P.INVALID_ARGUMENT,"Expected 'vectorValues' field to be a number array")}}}ht._jsonSchemaVersion="firestore/vectorValue/1.0",ht._jsonSchema={type:ye("string",ht._jsonSchemaVersion),vectorValues:ye("object")};/**
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
 */const db=/^__.*__$/;class fb{constructor(e,t,r){this.data=e,this.fieldMask=t,this.fieldTransforms=r}toMutation(e,t){return this.fieldMask!==null?new Ft(e,this.data,this.fieldMask,t,this.fieldTransforms):new ei(e,this.data,t,this.fieldTransforms)}}class v_{constructor(e,t,r){this.data=e,this.fieldMask=t,this.fieldTransforms=r}toMutation(e,t){return new Ft(e,this.data,this.fieldMask,t,this.fieldTransforms)}}function A_(n){switch(n){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw M(40011,{dataSource:n})}}class Pl{constructor(e,t,r,i,s,o){this.settings=e,this.databaseId=t,this.serializer=r,this.ignoreUndefinedProperties=i,s===void 0&&this.validatePath(),this.fieldTransforms=s||[],this.fieldMask=o||[]}get path(){return this.settings.path}get dataSource(){return this.settings.dataSource}contextWith(e){return new Pl({...this.settings,...e},this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}childContextForField(e){const t=this.path?.child(e),r=this.contextWith({path:t,arrayElement:!1});return r.validatePathSegment(e),r}childContextForFieldPath(e){const t=this.path?.child(e),r=this.contextWith({path:t,arrayElement:!1});return r.validatePath(),r}childContextForArray(e){return this.contextWith({path:void 0,arrayElement:!0})}createError(e){return Qo(e,this.settings.methodName,this.settings.hasConverter||!1,this.path,this.settings.targetDoc)}contains(e){return this.fieldMask.find((t=>e.isPrefixOf(t)))!==void 0||this.fieldTransforms.find((t=>e.isPrefixOf(t.field)))!==void 0}validatePath(){if(this.path)for(let e=0;e<this.path.length;e++)this.validatePathSegment(this.path.get(e))}validatePathSegment(e){if(e.length===0)throw this.createError("Document fields must not be empty");if(A_(this.dataSource)&&db.test(e))throw this.createError('Document fields cannot begin and end with "__"')}}class pb{constructor(e,t,r){this.databaseId=e,this.ignoreUndefinedProperties=t,this.serializer=r||Aa(e)}createContext(e,t,r,i=!1){return new Pl({dataSource:e,methodName:t,targetDoc:r,path:le.emptyPath(),arrayElement:!1,hasConverter:i},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function oi(n){const e=n._freezeSettings(),t=Aa(n._databaseId);return new pb(n._databaseId,!!e.ignoreUndefinedProperties,t)}function Ca(n,e,t,r,i,s={}){const o=n.createContext(s.merge||s.mergeFields?2:0,e,t,i);Nl("Data must be an object, but it was:",o,r);const c=b_(r,o);let u,l;if(s.merge)u=new ze(o.fieldMask),l=o.fieldTransforms;else if(s.mergeFields){const f=[];for(const p of s.mergeFields){const g=Zn(e,p,t);if(!o.contains(g))throw new N(P.INVALID_ARGUMENT,`Field '${g}' is specified in your field mask but missing from your input data.`);P_(f,g)||f.push(g)}u=new ze(f),l=o.fieldTransforms.filter((p=>u.covers(p.field)))}else u=null,l=o.fieldTransforms;return new fb(new Pe(c),u,l)}class Ds extends Pa{_toFieldTransform(e){if(e.dataSource!==2)throw e.dataSource===1?e.createError(`${this._methodName}() can only appear at the top level of your update data`):e.createError(`${this._methodName}() cannot be used with set() unless you pass {merge:true}`);return e.fieldMask.push(e.path),null}isEqual(e){return e instanceof Ds}}class Cl extends Pa{constructor(e,t){super(e),this.Vc=t}_toFieldTransform(e){const t=new zr(e.serializer,hg(e.serializer,this.Vc));return new gg(e.path,t)}isEqual(e){return e instanceof Cl&&this.Vc===e.Vc}}function kl(n,e,t,r){const i=n.createContext(1,e,t);Nl("Data must be an object, but it was:",i,r);const s=[],o=Pe.empty();En(r,((u,l)=>{const f=S_(e,u,t);l=K(l);const p=i.childContextForFieldPath(f);if(l instanceof Ds)s.push(f);else{const g=Ns(l,p);g!=null&&(s.push(f),o.set(f,g))}}));const c=new ze(s);return new v_(o,c,i.fieldTransforms)}function Dl(n,e,t,r,i,s){const o=n.createContext(1,e,t),c=[Zn(e,r,t)],u=[i];if(s.length%2!=0)throw new N(P.INVALID_ARGUMENT,`Function ${e}() needs to be called with an even number of arguments that alternate between field names and values.`);for(let g=0;g<s.length;g+=2)c.push(Zn(e,s[g])),u.push(s[g+1]);const l=[],f=Pe.empty();for(let g=c.length-1;g>=0;--g)if(!P_(l,c[g])){const A=c[g];let C=u[g];C=K(C);const V=o.childContextForFieldPath(A);if(C instanceof Ds)l.push(A);else{const D=Ns(C,V);D!=null&&(l.push(A),f.set(A,D))}}const p=new ze(l);return new v_(f,p,o.fieldTransforms)}function mb(n,e,t,r=!1){return Ns(t,n.createContext(r?4:3,e))}function Ns(n,e){if(R_(n=K(n)))return Nl("Unsupported field value:",e,n),b_(n,e);if(n instanceof Pa)return(function(r,i){if(!A_(i.dataSource))throw i.createError(`${r._methodName}() can only be used with update() and set()`);if(!i.path)throw i.createError(`${r._methodName}() is not currently supported inside arrays`);const s=r._toFieldTransform(i);s&&i.fieldTransforms.push(s)})(n,e),null;if(n===void 0&&e.ignoreUndefinedProperties)return null;if(e.path&&e.fieldMask.push(e.path),n instanceof Array){if(e.settings.arrayElement&&e.dataSource!==4)throw e.createError("Nested arrays are not supported");return(function(r,i){const s=[];let o=0;for(const c of r){let u=Ns(c,i.childContextForArray(o));u==null&&(u={nullValue:"NULL_VALUE"}),s.push(u),o++}return{arrayValue:{values:s}}})(n,e)}return(function(r,i){if((r=K(r))===null)return{nullValue:"NULL_VALUE"};if(typeof r=="number")return hg(i.serializer,r);if(typeof r=="boolean")return{booleanValue:r};if(typeof r=="string")return{stringValue:r};if(r instanceof Date){const s=te.fromDate(r);return{timestampValue:Gr(i.serializer,s)}}if(r instanceof te){const s=new te(r.seconds,1e3*Math.floor(r.nanoseconds/1e3));return{timestampValue:Gr(i.serializer,s)}}if(r instanceof Et)return{geoPointValue:{latitude:r.latitude,longitude:r.longitude}};if(r instanceof Je)return{bytesValue:vg(i.serializer,r._byteString)};if(r instanceof he){const s=i.databaseId,o=r.firestore._databaseId;if(!o.isEqual(s))throw i.createError(`Document reference is for database ${o.projectId}/${o.database} but should be for database ${s.projectId}/${s.database}`);return{referenceValue:tl(r.firestore._databaseId||i.databaseId,r._key.path)}}if(r instanceof ht)return(function(o,c){const u=o instanceof ht?o.toArray():o;return{mapValue:{fields:{[Gu]:{stringValue:Ku},[Fr]:{arrayValue:{values:u.map((f=>{if(typeof f!="number")throw c.createError("VectorValues must only contain numeric values.");return Qu(c.serializer,f)}))}}}}}})(r,i);if(Og(r))return r._toProto(i.serializer);throw i.createError(`Unsupported field value: ${ha(r)}`)})(n,e)}function b_(n,e){const t={};return Um(n)?e.path&&e.path.length>0&&e.fieldMask.push(e.path):En(n,((r,i)=>{const s=Ns(i,e.childContextForField(r));s!=null&&(t[r]=s)})),{mapValue:{fields:t}}}function R_(n){return!(typeof n!="object"||n===null||n instanceof Array||n instanceof Date||n instanceof te||n instanceof Et||n instanceof Je||n instanceof he||n instanceof Pa||n instanceof ht||Og(n))}function Nl(n,e,t){if(!R_(t)||!wm(t)){const r=ha(t);throw r==="an object"?e.createError(n+" a custom object"):e.createError(n+" "+r)}}function Zn(n,e,t){if((e=K(e))instanceof ks)return e._internalPath;if(typeof e=="string")return S_(n,e);throw Qo("Field path arguments must be of type string or ",n,!1,void 0,t)}const gb=new RegExp("[~\\*/\\[\\]]");function S_(n,e,t){if(e.search(gb)>=0)throw Qo(`Invalid field path (${e}). Paths must not contain '~', '*', '/', '[', or ']'`,n,!1,void 0,t);try{return new ks(...e.split("."))._internalPath}catch{throw Qo(`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,n,!1,void 0,t)}}function Qo(n,e,t,r,i){const s=r&&!r.isEmpty(),o=i!==void 0;let c=`Function ${e}() called with invalid data`;t&&(c+=" (via `toFirestore()`)"),c+=". ";let u="";return(s||o)&&(u+=" (found",s&&(u+=` in field ${r}`),o&&(u+=` in document ${i}`),u+=")"),new N(P.INVALID_ARGUMENT,c+n+u)}function P_(n,e){return n.some((t=>t.isEqual(e)))}/**
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
 */class C_{convertValue(e,t="none"){switch(dn(e)){case 0:return null;case 1:return e.booleanValue;case 2:return ae(e.integerValue||e.doubleValue);case 3:return this.convertTimestamp(e.timestampValue);case 4:return this.convertServerTimestamp(e,t);case 5:return e.stringValue;case 6:return this.convertBytes(Ot(e.bytesValue));case 7:return this.convertReference(e.referenceValue);case 8:return this.convertGeoPoint(e.geoPointValue);case 9:return this.convertArray(e.arrayValue,t);case 11:return this.convertObject(e.mapValue,t);case 10:return this.convertVectorValue(e.mapValue);default:throw M(62114,{value:e})}}convertObject(e,t){return this.convertObjectMap(e.fields,t)}convertObjectMap(e,t="none"){const r={};return En(e,((i,s)=>{r[i]=this.convertValue(s,t)})),r}convertVectorValue(e){const t=e.fields?.[Fr].arrayValue?.values?.map((r=>ae(r.doubleValue)));return new ht(t)}convertGeoPoint(e){return new Et(ae(e.latitude),ae(e.longitude))}convertArray(e,t){return(e.values||[]).map((r=>this.convertValue(r,t)))}convertServerTimestamp(e,t){switch(t){case"previous":const r=ga(e);return r==null?null:this.convertValue(r,t);case"estimate":return this.convertTimestamp(ss(e));default:return null}}convertTimestamp(e){const t=Vt(e);return new te(t.seconds,t.nanos)}convertDocumentKey(e,t){const r=ee.fromString(e);F(Vg(r),9688,{name:e});const i=new Hn(r.get(1),r.get(3)),s=new x(r.popFirst(5));return i.isEqual(t)||me(`Document ${s} contains a document reference within a different database (${i.projectId}/${i.database}) which is not supported. It will be treated as a reference in the current database (${t.projectId}/${t.database}) instead.`),s}}/**
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
 */class ka extends C_{constructor(e){super(),this.firestore=e}convertBytes(e){return new Je(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new he(this.firestore,null,t)}}/**
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
 */function dD(){return new Ds("deleteField")}function fD(n){return new Cl("increment",n)}const Wf="@firebase/firestore",Qf="4.11.0";/**
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
 */function Jf(n){return(function(t,r){if(typeof t!="object"||t===null)return!1;const i=t;for(const s of r)if(s in i&&typeof i[s]=="function")return!0;return!1})(n,["next","error","complete"])}/**
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
 */class Jo{constructor(e,t,r,i,s){this._firestore=e,this._userDataWriter=t,this._key=r,this._document=i,this._converter=s}get id(){return this._key.path.lastSegment()}get ref(){return new he(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const e=new _b(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}_fieldsProto(){return this._document?.data.clone().value.mapValue.fields??void 0}get(e){if(this._document){const t=this._document.data.field(Zn("DocumentSnapshot.get",e));if(t!==null)return this._userDataWriter.convertValue(t)}}}class _b extends Jo{data(){return super.data()}}/**
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
 */function k_(n){if(n.limitType==="L"&&n.explicitOrderBy.length===0)throw new N(P.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}class Vl{}class D_ extends Vl{}function pD(n,e,...t){let r=[];e instanceof Vl&&r.push(e),r=r.concat(t),(function(s){const o=s.filter((u=>u instanceof Ol)).length,c=s.filter((u=>u instanceof Da)).length;if(o>1||o>0&&c>0)throw new N(P.INVALID_ARGUMENT,"InvalidQuery. When using composite filters, you cannot use more than one filter at the top level. Consider nesting the multiple filters within an `and(...)` statement. For example: change `query(query, where(...), or(...))` to `query(query, and(where(...), or(...)))`.")})(r);for(const i of r)n=i._apply(n);return n}class Da extends D_{constructor(e,t,r){super(),this._field=e,this._op=t,this._value=r,this.type="where"}static _create(e,t,r){return new Da(e,t,r)}_apply(e){const t=this._parse(e);return N_(e._query,t),new vn(e.firestore,e.converter,ru(e._query,t))}_parse(e){const t=oi(e.firestore);return(function(s,o,c,u,l,f,p){let g;if(l.isKeyField()){if(f==="array-contains"||f==="array-contains-any")throw new N(P.INVALID_ARGUMENT,`Invalid Query. You can't perform '${f}' queries on documentId().`);if(f==="in"||f==="not-in"){Xf(p,f);const C=[];for(const V of p)C.push(Yf(u,s,V));g={arrayValue:{values:C}}}else g=Yf(u,s,p)}else f!=="in"&&f!=="not-in"&&f!=="array-contains-any"||Xf(p,f),g=mb(c,o,p,f==="in"||f==="not-in");return Y.create(l,f,g)})(e._query,"where",t,e.firestore._databaseId,this._field,this._op,this._value)}}function mD(n,e,t){const r=e,i=Zn("where",n);return Da._create(i,r,t)}class Ol extends Vl{constructor(e,t){super(),this.type=e,this._queryConstraints=t}static _create(e,t){return new Ol(e,t)}_parse(e){const t=this._queryConstraints.map((r=>r._parse(e))).filter((r=>r.getFilters().length>0));return t.length===1?t[0]:ne.create(t,this._getOperator())}_apply(e){const t=this._parse(e);return t.getFilters().length===0?e:((function(i,s){let o=i;const c=s.getFlattenedFilters();for(const u of c)N_(o,u),o=ru(o,u)})(e._query,t),new vn(e.firestore,e.converter,ru(e._query,t)))}_getQueryConstraints(){return this._queryConstraints}_getOperator(){return this.type==="and"?"and":"or"}}class xl extends D_{constructor(e,t){super(),this._field=e,this._direction=t,this.type="orderBy"}static _create(e,t){return new xl(e,t)}_apply(e){const t=(function(i,s,o){if(i.startAt!==null)throw new N(P.INVALID_ARGUMENT,"Invalid query. You must not call startAt() or startAfter() before calling orderBy().");if(i.endAt!==null)throw new N(P.INVALID_ARGUMENT,"Invalid query. You must not call endAt() or endBefore() before calling orderBy().");return new us(s,o)})(e._query,this._field,this._direction);return new vn(e.firestore,e.converter,zw(e._query,t))}}function gD(n,e="asc"){const t=e,r=Zn("orderBy",n);return xl._create(r,t)}function Yf(n,e,t){if(typeof(t=K(t))=="string"){if(t==="")throw new N(P.INVALID_ARGUMENT,"Invalid query. When querying with documentId(), you must provide a valid document ID, but it was an empty string.");if(!rg(e)&&t.indexOf("/")!==-1)throw new N(P.INVALID_ARGUMENT,`Invalid query. When querying a collection by documentId(), you must provide a plain document ID, but '${t}' contains a '/' character.`);const r=e.path.child(ee.fromString(t));if(!x.isDocumentKey(r))throw new N(P.INVALID_ARGUMENT,`Invalid query. When querying a collection group by documentId(), the value provided must result in a valid document path, but '${r}' is not because it has an odd number of segments (${r.length}).`);return as(n,new x(r))}if(t instanceof he)return as(n,t._key);throw new N(P.INVALID_ARGUMENT,`Invalid query. When querying with documentId(), you must provide a valid string or a DocumentReference, but it was: ${ha(t)}.`)}function Xf(n,e){if(!Array.isArray(n)||n.length===0)throw new N(P.INVALID_ARGUMENT,`Invalid Query. A non-empty array is required for '${e.toString()}' filters.`)}function N_(n,e){const t=(function(i,s){for(const o of i)for(const c of o.getFlattenedFilters())if(s.indexOf(c.op)>=0)return c.op;return null})(n.filters,(function(i){switch(i){case"!=":return["!=","not-in"];case"array-contains-any":case"in":return["not-in"];case"not-in":return["array-contains-any","in","not-in","!="];default:return[]}})(e.op));if(t!==null)throw t===e.op?new N(P.INVALID_ARGUMENT,`Invalid query. You cannot use more than one '${e.op.toString()}' filter.`):new N(P.INVALID_ARGUMENT,`Invalid query. You cannot use '${e.op.toString()}' filters with '${t.toString()}' filters.`)}function Na(n,e,t){let r;return r=n?t&&(t.merge||t.mergeFields)?n.toFirestore(e,t):n.toFirestore(e):e,r}class yb extends C_{constructor(e){super(),this.firestore=e}convertBytes(e){return new Je(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new he(this.firestore,null,t)}}class Ib{constructor(e){let t;this.kind="persistent",e?.tabManager?(e.tabManager._initialize(e),t=e.tabManager):(t=wb(void 0),t._initialize(e)),this._onlineComponentProvider=t._onlineComponentProvider,this._offlineComponentProvider=t._offlineComponentProvider}toJSON(){return{kind:this.kind}}}function _D(n){return new Ib(n)}class Tb{constructor(e){this.forceOwnership=e,this.kind="persistentSingleTab"}toJSON(){return{kind:this.kind}}_initialize(e){this._onlineComponentProvider=ps.provider,this._offlineComponentProvider={build:t=>new E_(t,e?.cacheSizeBytes,this.forceOwnership)}}}class Eb{constructor(){this.kind="PersistentMultipleTab"}toJSON(){return{kind:this.kind}}_initialize(e){this._onlineComponentProvider=ps.provider,this._offlineComponentProvider={build:t=>new QA(t,e?.cacheSizeBytes)}}}function wb(n){return new Tb(n?.forceOwnership)}function yD(){return new Eb}class Er{constructor(e,t){this.hasPendingWrites=e,this.fromCache=t}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}}class ln extends Jo{constructor(e,t,r,i,s,o){super(e,t,r,i,o),this._firestore=e,this._firestoreImpl=e,this.metadata=s}exists(){return super.exists()}data(e={}){if(this._document){if(this._converter){const t=new Ao(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(t,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e,t={}){if(this._document){const r=this._document.data.field(Zn("DocumentSnapshot.get",e));if(r!==null)return this._userDataWriter.convertValue(r,t.serverTimestamps)}}toJSON(){if(this.metadata.hasPendingWrites)throw new N(P.FAILED_PRECONDITION,"DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e=this._document,t={};return t.type=ln._jsonSchemaVersion,t.bundle="",t.bundleSource="DocumentSnapshot",t.bundleName=this._key.toString(),!e||!e.isValidDocument()||!e.isFoundDocument()?t:(this._userDataWriter.convertObjectMap(e.data.value.mapValue.fields,"previous"),t.bundle=(this._firestore,this.ref.path,"NOT SUPPORTED"),t)}}ln._jsonSchemaVersion="firestore/documentSnapshot/1.0",ln._jsonSchema={type:ye("string",ln._jsonSchemaVersion),bundleSource:ye("string","DocumentSnapshot"),bundleName:ye("string"),bundle:ye("string")};class Ao extends ln{data(e={}){return super.data(e)}}class jn{constructor(e,t,r,i){this._firestore=e,this._userDataWriter=t,this._snapshot=i,this.metadata=new Er(i.hasPendingWrites,i.fromCache),this.query=r}get docs(){const e=[];return this.forEach((t=>e.push(t))),e}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(e,t){this._snapshot.docs.forEach((r=>{e.call(t,new Ao(this._firestore,this._userDataWriter,r.key,r,new Er(this._snapshot.mutatedKeys.has(r.key),this._snapshot.fromCache),this.query.converter))}))}docChanges(e={}){const t=!!e.includeMetadataChanges;if(t&&this._snapshot.excludesMetadataChanges)throw new N(P.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===t||(this._cachedChanges=(function(i,s){if(i._snapshot.oldDocs.isEmpty()){let o=0;return i._snapshot.docChanges.map((c=>{const u=new Ao(i._firestore,i._userDataWriter,c.doc.key,c.doc,new Er(i._snapshot.mutatedKeys.has(c.doc.key),i._snapshot.fromCache),i.query.converter);return c.doc,{type:"added",doc:u,oldIndex:-1,newIndex:o++}}))}{let o=i._snapshot.oldDocs;return i._snapshot.docChanges.filter((c=>s||c.type!==3)).map((c=>{const u=new Ao(i._firestore,i._userDataWriter,c.doc.key,c.doc,new Er(i._snapshot.mutatedKeys.has(c.doc.key),i._snapshot.fromCache),i.query.converter);let l=-1,f=-1;return c.type!==0&&(l=o.indexOf(c.doc.key),o=o.delete(c.doc.key)),c.type!==1&&(o=o.add(c.doc),f=o.indexOf(c.doc.key)),{type:vb(c.type),doc:u,oldIndex:l,newIndex:f}}))}})(this,t),this._cachedChangesIncludeMetadataChanges=t),this._cachedChanges}toJSON(){if(this.metadata.hasPendingWrites)throw new N(P.FAILED_PRECONDITION,"QuerySnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e={};e.type=jn._jsonSchemaVersion,e.bundleSource="QuerySnapshot",e.bundleName=Lu.newId(),this._firestore._databaseId.database,this._firestore._databaseId.projectId;const t=[],r=[],i=[];return this.docs.forEach((s=>{s._document!==null&&(t.push(s._document),r.push(this._userDataWriter.convertObjectMap(s._document.data.value.mapValue.fields,"previous")),i.push(s.ref.path))})),e.bundle=(this._firestore,this.query._query,e.bundleName,"NOT SUPPORTED"),e}}function vb(n){switch(n){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return M(61501,{type:n})}}/**
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
 */jn._jsonSchemaVersion="firestore/querySnapshot/1.0",jn._jsonSchema={type:ye("string",jn._jsonSchemaVersion),bundleSource:ye("string","QuerySnapshot"),bundleName:ye("string"),bundle:ye("string")};const Ab={maxAttempts:5};/**
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
 */class bb{constructor(e,t){this._firestore=e,this._commitHandler=t,this._mutations=[],this._committed=!1,this._dataReader=oi(e)}set(e,t,r){this._verifyNotCommitted();const i=rn(e,this._firestore),s=Na(i.converter,t,r),o=Ca(this._dataReader,"WriteBatch.set",i._key,s,i.converter!==null,r);return this._mutations.push(o.toMutation(i._key,ue.none())),this}update(e,t,r,...i){this._verifyNotCommitted();const s=rn(e,this._firestore);let o;return o=typeof(t=K(t))=="string"||t instanceof ks?Dl(this._dataReader,"WriteBatch.update",s._key,t,r,i):kl(this._dataReader,"WriteBatch.update",s._key,t),this._mutations.push(o.toMutation(s._key,ue.exists(!0))),this}delete(e){this._verifyNotCommitted();const t=rn(e,this._firestore);return this._mutations=this._mutations.concat(new ti(t._key,ue.none())),this}commit(){return this._verifyNotCommitted(),this._committed=!0,this._mutations.length>0?this._commitHandler(this._mutations):Promise.resolve()}_verifyNotCommitted(){if(this._committed)throw new N(P.FAILED_PRECONDITION,"A write batch can no longer be used after commit() has been called.")}}function rn(n,e){if((n=K(n)).firestore!==e)throw new N(P.INVALID_ARGUMENT,"Provided document reference is from a different Firestore instance.");return n}/**
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
 */class Rb{constructor(e,t){this._firestore=e,this._transaction=t,this._dataReader=oi(e)}get(e){const t=rn(e,this._firestore),r=new yb(this._firestore);return this._transaction.lookup([t._key]).then((i=>{if(!i||i.length!==1)return M(24041);const s=i[0];if(s.isFoundDocument())return new Jo(this._firestore,r,s.key,s,t.converter);if(s.isNoDocument())return new Jo(this._firestore,r,t._key,null,t.converter);throw M(18433,{doc:s})}))}set(e,t,r){const i=rn(e,this._firestore),s=Na(i.converter,t,r),o=Ca(this._dataReader,"Transaction.set",i._key,s,i.converter!==null,r);return this._transaction.set(i._key,o),this}update(e,t,r,...i){const s=rn(e,this._firestore);let o;return o=typeof(t=K(t))=="string"||t instanceof ks?Dl(this._dataReader,"Transaction.update",s._key,t,r,i):kl(this._dataReader,"Transaction.update",s._key,t),this._transaction.update(s._key,o),this}delete(e){const t=rn(e,this._firestore);return this._transaction.delete(t._key),this}}/**
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
 */class Sb extends Rb{constructor(e,t){super(e,t),this._firestore=e}get(e){const t=rn(e,this._firestore),r=new ka(this._firestore);return super.get(e).then((i=>new ln(this._firestore,r,t._key,i._document,new Er(!1,!1),t.converter)))}}function ID(n,e,t){n=Be(n,dt);const r={...Ab,...t};(function(o){if(o.maxAttempts<1)throw new N(P.INVALID_ARGUMENT,"Max attempts must be at least 1")})(r);const i=si(n);return ob(i,(s=>e(new Sb(n,s))),r)}/**
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
 */function TD(n){n=Be(n,he);const e=Be(n.firestore,dt),t=si(e);return rb(t,n._key).then((r=>V_(e,n,r)))}function ED(n){n=Be(n,vn);const e=Be(n.firestore,dt),t=si(e),r=new ka(e);return k_(n._query),ib(t,n._query).then((i=>new jn(e,r,n,i)))}function wD(n,e,t){n=Be(n,he);const r=Be(n.firestore,dt),i=Na(n.converter,e,t),s=oi(r);return Vs(r,[Ca(s,"setDoc",n._key,i,n.converter!==null,t).toMutation(n._key,ue.none())])}function vD(n,e,t,...r){n=Be(n,he);const i=Be(n.firestore,dt),s=oi(i);let o;return o=typeof(e=K(e))=="string"||e instanceof ks?Dl(s,"updateDoc",n._key,e,t,r):kl(s,"updateDoc",n._key,e),Vs(i,[o.toMutation(n._key,ue.exists(!0))])}function AD(n){return Vs(Be(n.firestore,dt),[new ti(n._key,ue.none())])}function bD(n,e){const t=Be(n.firestore,dt),r=lb(n),i=Na(n.converter,e),s=oi(n.firestore);return Vs(t,[Ca(s,"addDoc",r._key,i,n.converter!==null,{}).toMutation(r._key,ue.exists(!1))]).then((()=>r))}function RD(n,...e){n=K(n);let t={includeMetadataChanges:!1,source:"default"},r=0;typeof e[r]!="object"||Jf(e[r])||(t=e[r++]);const i={includeMetadataChanges:t.includeMetadataChanges,source:t.source};if(Jf(e[r])){const l=e[r];e[r]=l.next?.bind(l),e[r+1]=l.error?.bind(l),e[r+2]=l.complete?.bind(l)}let s,o,c;if(n instanceof he)o=Be(n.firestore,dt),c=bs(n._key.path),s={next:l=>{e[r]&&e[r](V_(o,n,l))},error:e[r+1],complete:e[r+2]};else{const l=Be(n,vn);o=Be(l.firestore,dt),c=l._query;const f=new ka(o);s={next:p=>{e[r]&&e[r](new jn(o,f,l,p))},error:e[r+1],complete:e[r+2]},k_(n._query)}const u=si(o);return nb(u,c,i,s)}function Vs(n,e){const t=si(n);return sb(t,e)}function V_(n,e,t){const r=t.docs.get(e._key),i=new ka(n);return new ln(n,i,e._key,r,new Er(t.hasPendingWrites,t.fromCache),e.converter)}function SD(n){return n=Be(n,dt),si(n),new bb(n,(e=>Vs(n,e)))}(function(e,t=!0){$E(sr),tt(new Ke("firestore",((r,{instanceIdentifier:i,options:s})=>{const o=r.getProvider("app").getImmediate(),c=new dt(new zE(r.getProvider("auth-internal")),new HE(o,r.getProvider("app-check-internal")),Dw(o,i),o);return s={useFetchStreams:t,...s},c._setSettings(s),c}),"PUBLIC").setMultipleInstances(!0)),be(Wf,Qf,e),be(Wf,Qf,"esm2020")})();var Pb="firebase",Cb="12.9.0";/**
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
 */be(Pb,Cb,"app");function O_(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}const kb=O_,x_=new yn("auth","Firebase",O_());/**
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
 */const Yo=new Is("@firebase/auth");function Db(n,...e){Yo.logLevel<=J.WARN&&Yo.warn(`Auth (${sr}): ${n}`,...e)}function bo(n,...e){Yo.logLevel<=J.ERROR&&Yo.error(`Auth (${sr}): ${n}`,...e)}/**
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
 */function st(n,...e){throw Ml(n,...e)}function wt(n,...e){return Ml(n,...e)}function M_(n,e,t){const r={...kb(),[e]:t};return new yn("auth","Firebase",r).create(e,{appName:n.name})}function Dt(n){return M_(n,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function Ml(n,...e){if(typeof n!="string"){const t=e[0],r=[...e.slice(1)];return r[0]&&(r[0].appName=n.name),n._errorFactory.create(t,...r)}return x_.create(n,...e)}function $(n,e,...t){if(!n)throw Ml(e,...t)}function Pt(n){const e="INTERNAL ASSERTION FAILED: "+n;throw bo(e),new Error(e)}function xt(n,e){n||Pt(e)}/**
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
 */function yu(){return typeof self<"u"&&self.location?.href||""}function Nb(){return Zf()==="http:"||Zf()==="https:"}function Zf(){return typeof self<"u"&&self.location?.protocol||null}/**
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
 */function Vb(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(Nb()||Vu()||"connection"in navigator)?navigator.onLine:!0}function Ob(){if(typeof navigator>"u")return null;const n=navigator;return n.languages&&n.languages[0]||n.language||null}/**
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
 */class Os{constructor(e,t){this.shortDelay=e,this.longDelay=t,xt(t>e,"Short delay should be less than long delay!"),this.isMobile=yT()||TT()}get(){return Vb()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
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
 */function Ll(n,e){xt(n.emulator,"Emulator should always be set here");const{url:t}=n.emulator;return e?`${t}${e.startsWith("/")?e.slice(1):e}`:t}/**
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
 */class L_{static initialize(e,t,r){this.fetchImpl=e,t&&(this.headersImpl=t),r&&(this.responseImpl=r)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self<"u"&&"fetch"in self)return self.fetch;if(typeof globalThis<"u"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch<"u")return fetch;Pt("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self<"u"&&"Headers"in self)return self.Headers;if(typeof globalThis<"u"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers<"u")return Headers;Pt("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self<"u"&&"Response"in self)return self.Response;if(typeof globalThis<"u"&&globalThis.Response)return globalThis.Response;if(typeof Response<"u")return Response;Pt("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}/**
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
 */const xb={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};/**
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
 */const Mb=["/v1/accounts:signInWithCustomToken","/v1/accounts:signInWithEmailLink","/v1/accounts:signInWithIdp","/v1/accounts:signInWithPassword","/v1/accounts:signInWithPhoneNumber","/v1/token"],Lb=new Os(3e4,6e4);function ft(n,e){return n.tenantId&&!e.tenantId?{...e,tenantId:n.tenantId}:e}async function ot(n,e,t,r,i={}){return F_(n,i,async()=>{let s={},o={};r&&(e==="GET"?o=r:s={body:JSON.stringify(r)});const c=ys({key:n.config.apiKey,...o}).slice(1),u=await n._getAdditionalHeaders();u["Content-Type"]="application/json",n.languageCode&&(u["X-Firebase-Locale"]=n.languageCode);const l={method:e,headers:u,...s};return IT()||(l.referrerPolicy="no-referrer"),n.emulatorConfig&&bt(n.emulatorConfig.host)&&(l.credentials="include"),L_.fetch()(await U_(n,n.config.apiHost,t,c),l)})}async function F_(n,e,t){n._canInitEmulator=!1;const r={...xb,...e};try{const i=new Ub(n),s=await Promise.race([t(),i.promise]);i.clearNetworkTimeout();const o=await s.json();if("needConfirmation"in o)throw ao(n,"account-exists-with-different-credential",o);if(s.ok&&!("errorMessage"in o))return o;{const c=s.ok?o.errorMessage:o.error.message,[u,l]=c.split(" : ");if(u==="FEDERATED_USER_ID_ALREADY_LINKED")throw ao(n,"credential-already-in-use",o);if(u==="EMAIL_EXISTS")throw ao(n,"email-already-in-use",o);if(u==="USER_DISABLED")throw ao(n,"user-disabled",o);const f=r[u]||u.toLowerCase().replace(/[_\s]+/g,"-");if(l)throw M_(n,f,l);st(n,f)}}catch(i){if(i instanceof rt)throw i;st(n,"network-request-failed",{message:String(i)})}}async function xs(n,e,t,r,i={}){const s=await ot(n,e,t,r,i);return"mfaPendingCredential"in s&&st(n,"multi-factor-auth-required",{_serverResponse:s}),s}async function U_(n,e,t,r){const i=`${e}${t}?${r}`,s=n,o=s.config.emulator?Ll(n.config,i):`${n.config.apiScheme}://${i}`;return Mb.includes(t)&&(await s._persistenceManagerAvailable,s._getPersistenceType()==="COOKIE")?s._getPersistence()._getFinalTarget(o).toString():o}function Fb(n){switch(n){case"ENFORCE":return"ENFORCE";case"AUDIT":return"AUDIT";case"OFF":return"OFF";default:return"ENFORCEMENT_STATE_UNSPECIFIED"}}class Ub{clearNetworkTimeout(){clearTimeout(this.timer)}constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((t,r)=>{this.timer=setTimeout(()=>r(wt(this.auth,"network-request-failed")),Lb.get())})}}function ao(n,e,t){const r={appName:n.name};t.email&&(r.email=t.email),t.phoneNumber&&(r.phoneNumber=t.phoneNumber);const i=wt(n,e,r);return i.customData._tokenResponse=t,i}function ep(n){return n!==void 0&&n.enterprise!==void 0}class Bb{constructor(e){if(this.siteKey="",this.recaptchaEnforcementState=[],e.recaptchaKey===void 0)throw new Error("recaptchaKey undefined");this.siteKey=e.recaptchaKey.split("/")[3],this.recaptchaEnforcementState=e.recaptchaEnforcementState}getProviderEnforcementState(e){if(!this.recaptchaEnforcementState||this.recaptchaEnforcementState.length===0)return null;for(const t of this.recaptchaEnforcementState)if(t.provider&&t.provider===e)return Fb(t.enforcementState);return null}isProviderEnabled(e){return this.getProviderEnforcementState(e)==="ENFORCE"||this.getProviderEnforcementState(e)==="AUDIT"}isAnyProviderEnabled(){return this.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")||this.isProviderEnabled("PHONE_PROVIDER")}}async function $b(n,e){return ot(n,"GET","/v2/recaptchaConfig",ft(n,e))}/**
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
 */async function qb(n,e){return ot(n,"POST","/v1/accounts:delete",e)}async function Xo(n,e){return ot(n,"POST","/v1/accounts:lookup",e)}/**
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
 */function Wi(n){if(n)try{const e=new Date(Number(n));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}async function jb(n,e=!1){const t=K(n),r=await t.getIdToken(e),i=Fl(r);$(i&&i.exp&&i.auth_time&&i.iat,t.auth,"internal-error");const s=typeof i.firebase=="object"?i.firebase:void 0,o=s?.sign_in_provider;return{claims:i,token:r,authTime:Wi(Rc(i.auth_time)),issuedAtTime:Wi(Rc(i.iat)),expirationTime:Wi(Rc(i.exp)),signInProvider:o||null,signInSecondFactor:s?.sign_in_second_factor||null}}function Rc(n){return Number(n)*1e3}function Fl(n){const[e,t,r]=n.split(".");if(e===void 0||t===void 0||r===void 0)return bo("JWT malformed, contained fewer than 3 sections"),null;try{const i=Zp(t);return i?JSON.parse(i):(bo("Failed to decode base64 JWT payload"),null)}catch(i){return bo("Caught error parsing JWT payload as JSON",i?.toString()),null}}function tp(n){const e=Fl(n);return $(e,"internal-error"),$(typeof e.exp<"u","internal-error"),$(typeof e.iat<"u","internal-error"),Number(e.exp)-Number(e.iat)}/**
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
 */async function Jr(n,e,t=!1){if(t)return e;try{return await e}catch(r){throw r instanceof rt&&zb(r)&&n.auth.currentUser===n&&await n.auth.signOut(),r}}function zb({code:n}){return n==="auth/user-disabled"||n==="auth/user-token-expired"}/**
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
 */class Gb{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){if(e){const t=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),t}else{this.errorBackoff=3e4;const r=(this.user.stsTokenManager.expirationTime??0)-Date.now()-3e5;return Math.max(0,r)}}schedule(e=!1){if(!this.isRunning)return;const t=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},t)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){e?.code==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
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
 */class Iu{constructor(e,t){this.createdAt=e,this.lastLoginAt=t,this._initializeTime()}_initializeTime(){this.lastSignInTime=Wi(this.lastLoginAt),this.creationTime=Wi(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
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
 */async function Zo(n){const e=n.auth,t=await n.getIdToken(),r=await Jr(n,Xo(e,{idToken:t}));$(r?.users.length,e,"internal-error");const i=r.users[0];n._notifyReloadListener(i);const s=i.providerUserInfo?.length?B_(i.providerUserInfo):[],o=Hb(n.providerData,s),c=n.isAnonymous,u=!(n.email&&i.passwordHash)&&!o?.length,l=c?u:!1,f={uid:i.localId,displayName:i.displayName||null,photoURL:i.photoUrl||null,email:i.email||null,emailVerified:i.emailVerified||!1,phoneNumber:i.phoneNumber||null,tenantId:i.tenantId||null,providerData:o,metadata:new Iu(i.createdAt,i.lastLoginAt),isAnonymous:l};Object.assign(n,f)}async function Kb(n){const e=K(n);await Zo(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function Hb(n,e){return[...n.filter(r=>!e.some(i=>i.providerId===r.providerId)),...e]}function B_(n){return n.map(({providerId:e,...t})=>({providerId:e,uid:t.rawId||"",displayName:t.displayName||null,email:t.email||null,phoneNumber:t.phoneNumber||null,photoURL:t.photoUrl||null}))}/**
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
 */async function Wb(n,e){const t=await F_(n,{},async()=>{const r=ys({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:i,apiKey:s}=n.config,o=await U_(n,i,"/v1/token",`key=${s}`),c=await n._getAdditionalHeaders();c["Content-Type"]="application/x-www-form-urlencoded";const u={method:"POST",headers:c,body:r};return n.emulatorConfig&&bt(n.emulatorConfig.host)&&(u.credentials="include"),L_.fetch()(o,u)});return{accessToken:t.access_token,expiresIn:t.expires_in,refreshToken:t.refresh_token}}async function Qb(n,e){return ot(n,"POST","/v2/accounts:revokeToken",ft(n,e))}/**
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
 */class Rr{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){$(e.idToken,"internal-error"),$(typeof e.idToken<"u","internal-error"),$(typeof e.refreshToken<"u","internal-error");const t="expiresIn"in e&&typeof e.expiresIn<"u"?Number(e.expiresIn):tp(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,t)}updateFromIdToken(e){$(e.length!==0,"internal-error");const t=tp(e);this.updateTokensAndExpiration(e,null,t)}async getToken(e,t=!1){return!t&&this.accessToken&&!this.isExpired?this.accessToken:($(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,t){const{accessToken:r,refreshToken:i,expiresIn:s}=await Wb(e,t);this.updateTokensAndExpiration(r,i,Number(s))}updateTokensAndExpiration(e,t,r){this.refreshToken=t||null,this.accessToken=e||null,this.expirationTime=Date.now()+r*1e3}static fromJSON(e,t){const{refreshToken:r,accessToken:i,expirationTime:s}=t,o=new Rr;return r&&($(typeof r=="string","internal-error",{appName:e}),o.refreshToken=r),i&&($(typeof i=="string","internal-error",{appName:e}),o.accessToken=i),s&&($(typeof s=="number","internal-error",{appName:e}),o.expirationTime=s),o}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new Rr,this.toJSON())}_performRefresh(){return Pt("not implemented")}}/**
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
 */function Wt(n,e){$(typeof n=="string"||typeof n>"u","internal-error",{appName:e})}class ut{constructor({uid:e,auth:t,stsTokenManager:r,...i}){this.providerId="firebase",this.proactiveRefresh=new Gb(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=e,this.auth=t,this.stsTokenManager=r,this.accessToken=r.accessToken,this.displayName=i.displayName||null,this.email=i.email||null,this.emailVerified=i.emailVerified||!1,this.phoneNumber=i.phoneNumber||null,this.photoURL=i.photoURL||null,this.isAnonymous=i.isAnonymous||!1,this.tenantId=i.tenantId||null,this.providerData=i.providerData?[...i.providerData]:[],this.metadata=new Iu(i.createdAt||void 0,i.lastLoginAt||void 0)}async getIdToken(e){const t=await Jr(this,this.stsTokenManager.getToken(this.auth,e));return $(t,this.auth,"internal-error"),this.accessToken!==t&&(this.accessToken=t,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),t}getIdTokenResult(e){return jb(this,e)}reload(){return Kb(this)}_assign(e){this!==e&&($(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(t=>({...t})),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const t=new ut({...this,auth:e,stsTokenManager:this.stsTokenManager._clone()});return t.metadata._copy(this.metadata),t}_onReload(e){$(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,t=!1){let r=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),r=!0),t&&await Zo(this),await this.auth._persistUserIfCurrent(this),r&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(qe(this.auth.app))return Promise.reject(Dt(this.auth));const e=await this.getIdToken();return await Jr(this,qb(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return{uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>({...e})),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId,...this.metadata.toJSON(),apiKey:this.auth.config.apiKey,appName:this.auth.name}}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,t){const r=t.displayName??void 0,i=t.email??void 0,s=t.phoneNumber??void 0,o=t.photoURL??void 0,c=t.tenantId??void 0,u=t._redirectEventId??void 0,l=t.createdAt??void 0,f=t.lastLoginAt??void 0,{uid:p,emailVerified:g,isAnonymous:A,providerData:C,stsTokenManager:V}=t;$(p&&V,e,"internal-error");const D=Rr.fromJSON(this.name,V);$(typeof p=="string",e,"internal-error"),Wt(r,e.name),Wt(i,e.name),$(typeof g=="boolean",e,"internal-error"),$(typeof A=="boolean",e,"internal-error"),Wt(s,e.name),Wt(o,e.name),Wt(c,e.name),Wt(u,e.name),Wt(l,e.name),Wt(f,e.name);const j=new ut({uid:p,auth:e,email:i,emailVerified:g,displayName:r,isAnonymous:A,photoURL:o,phoneNumber:s,tenantId:c,stsTokenManager:D,createdAt:l,lastLoginAt:f});return C&&Array.isArray(C)&&(j.providerData=C.map(q=>({...q}))),u&&(j._redirectEventId=u),j}static async _fromIdTokenResponse(e,t,r=!1){const i=new Rr;i.updateFromServerResponse(t);const s=new ut({uid:t.localId,auth:e,stsTokenManager:i,isAnonymous:r});return await Zo(s),s}static async _fromGetAccountInfoResponse(e,t,r){const i=t.users[0];$(i.localId!==void 0,"internal-error");const s=i.providerUserInfo!==void 0?B_(i.providerUserInfo):[],o=!(i.email&&i.passwordHash)&&!s?.length,c=new Rr;c.updateFromIdToken(r);const u=new ut({uid:i.localId,auth:e,stsTokenManager:c,isAnonymous:o}),l={uid:i.localId,displayName:i.displayName||null,photoURL:i.photoUrl||null,email:i.email||null,emailVerified:i.emailVerified||!1,phoneNumber:i.phoneNumber||null,tenantId:i.tenantId||null,providerData:s,metadata:new Iu(i.createdAt,i.lastLoginAt),isAnonymous:!(i.email&&i.passwordHash)&&!s?.length};return Object.assign(u,l),u}}/**
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
 */const np=new Map;function Ct(n){xt(n instanceof Function,"Expected a class definition");let e=np.get(n);return e?(xt(e instanceof n,"Instance stored in cache mismatched with class"),e):(e=new n,np.set(n,e),e)}/**
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
 */class $_{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,t){this.storage[e]=t}async _get(e){const t=this.storage[e];return t===void 0?null:t}async _remove(e){delete this.storage[e]}_addListener(e,t){}_removeListener(e,t){}}$_.type="NONE";const rp=$_;/**
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
 */function Ro(n,e,t){return`firebase:${n}:${e}:${t}`}class Sr{constructor(e,t,r){this.persistence=e,this.auth=t,this.userKey=r;const{config:i,name:s}=this.auth;this.fullUserKey=Ro(this.userKey,i.apiKey,s),this.fullPersistenceKey=Ro("persistence",i.apiKey,s),this.boundEventHandler=t._onStorageEvent.bind(t),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);if(!e)return null;if(typeof e=="string"){const t=await Xo(this.auth,{idToken:e}).catch(()=>{});return t?ut._fromGetAccountInfoResponse(this.auth,t,e):null}return ut._fromJSON(this.auth,e)}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const t=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,t)return this.setCurrentUser(t)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,t,r="authUser"){if(!t.length)return new Sr(Ct(rp),e,r);const i=(await Promise.all(t.map(async l=>{if(await l._isAvailable())return l}))).filter(l=>l);let s=i[0]||Ct(rp);const o=Ro(r,e.config.apiKey,e.name);let c=null;for(const l of t)try{const f=await l._get(o);if(f){let p;if(typeof f=="string"){const g=await Xo(e,{idToken:f}).catch(()=>{});if(!g)break;p=await ut._fromGetAccountInfoResponse(e,g,f)}else p=ut._fromJSON(e,f);l!==s&&(c=p),s=l;break}}catch{}const u=i.filter(l=>l._shouldAllowMigration);return!s._shouldAllowMigration||!u.length?new Sr(s,e,r):(s=u[0],c&&await s._set(o,c.toJSON()),await Promise.all(t.map(async l=>{if(l!==s)try{await l._remove(o)}catch{}})),new Sr(s,e,r))}}/**
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
 */function ip(n){const e=n.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(G_(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(q_(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(H_(e))return"Blackberry";if(W_(e))return"Webos";if(j_(e))return"Safari";if((e.includes("chrome/")||z_(e))&&!e.includes("edge/"))return"Chrome";if(K_(e))return"Android";{const t=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,r=n.match(t);if(r?.length===2)return r[1]}return"Other"}function q_(n=Ee()){return/firefox\//i.test(n)}function j_(n=Ee()){const e=n.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function z_(n=Ee()){return/crios\//i.test(n)}function G_(n=Ee()){return/iemobile/i.test(n)}function K_(n=Ee()){return/android/i.test(n)}function H_(n=Ee()){return/blackberry/i.test(n)}function W_(n=Ee()){return/webos/i.test(n)}function Ul(n=Ee()){return/iphone|ipad|ipod/i.test(n)||/macintosh/i.test(n)&&/mobile/i.test(n)}function Jb(n=Ee()){return Ul(n)&&!!window.navigator?.standalone}function Yb(){return ET()&&document.documentMode===10}function Q_(n=Ee()){return Ul(n)||K_(n)||W_(n)||H_(n)||/windows phone/i.test(n)||G_(n)}/**
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
 */function J_(n,e=[]){let t;switch(n){case"Browser":t=ip(Ee());break;case"Worker":t=`${ip(Ee())}-${n}`;break;default:t=n}const r=e.length?e.join(","):"FirebaseCore-web";return`${t}/JsCore/${sr}/${r}`}/**
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
 */class Xb{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,t){const r=s=>new Promise((o,c)=>{try{const u=e(s);o(u)}catch(u){c(u)}});r.onAbort=t,this.queue.push(r);const i=this.queue.length-1;return()=>{this.queue[i]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const t=[];try{for(const r of this.queue)await r(e),r.onAbort&&t.push(r.onAbort)}catch(r){t.reverse();for(const i of t)try{i()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:r?.message})}}}/**
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
 */async function Zb(n,e={}){return ot(n,"GET","/v2/passwordPolicy",ft(n,e))}/**
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
 */const eR=6;class tR{constructor(e){const t=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=t.minPasswordLength??eR,t.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=t.maxPasswordLength),t.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=t.containsLowercaseCharacter),t.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=t.containsUppercaseCharacter),t.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=t.containsNumericCharacter),t.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=t.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=e.allowedNonAlphanumericCharacters?.join("")??"",this.forceUpgradeOnSignin=e.forceUpgradeOnSignin??!1,this.schemaVersion=e.schemaVersion}validatePassword(e){const t={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,t),this.validatePasswordCharacterOptions(e,t),t.isValid&&(t.isValid=t.meetsMinPasswordLength??!0),t.isValid&&(t.isValid=t.meetsMaxPasswordLength??!0),t.isValid&&(t.isValid=t.containsLowercaseLetter??!0),t.isValid&&(t.isValid=t.containsUppercaseLetter??!0),t.isValid&&(t.isValid=t.containsNumericCharacter??!0),t.isValid&&(t.isValid=t.containsNonAlphanumericCharacter??!0),t}validatePasswordLengthOptions(e,t){const r=this.customStrengthOptions.minPasswordLength,i=this.customStrengthOptions.maxPasswordLength;r&&(t.meetsMinPasswordLength=e.length>=r),i&&(t.meetsMaxPasswordLength=e.length<=i)}validatePasswordCharacterOptions(e,t){this.updatePasswordCharacterOptionsStatuses(t,!1,!1,!1,!1);let r;for(let i=0;i<e.length;i++)r=e.charAt(i),this.updatePasswordCharacterOptionsStatuses(t,r>="a"&&r<="z",r>="A"&&r<="Z",r>="0"&&r<="9",this.allowedNonAlphanumericCharacters.includes(r))}updatePasswordCharacterOptionsStatuses(e,t,r,i,s){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=t)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=r)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=i)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=s))}}/**
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
 */class nR{constructor(e,t,r,i){this.app=e,this.heartbeatServiceProvider=t,this.appCheckServiceProvider=r,this.config=i,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new sp(this),this.idTokenSubscription=new sp(this),this.beforeStateQueue=new Xb(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=x_,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this._resolvePersistenceManagerAvailable=void 0,this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=i.sdkClientVersion,this._persistenceManagerAvailable=new Promise(s=>this._resolvePersistenceManagerAvailable=s)}_initializeWithPersistence(e,t){return t&&(this._popupRedirectResolver=Ct(t)),this._initializationPromise=this.queue(async()=>{if(!this._deleted&&(this.persistenceManager=await Sr.create(this,e),this._resolvePersistenceManagerAvailable?.(),!this._deleted)){if(this._popupRedirectResolver?._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}await this.initializeCurrentUser(t),this.lastNotifiedUid=this.currentUser?.uid||null,!this._deleted&&(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{const t=await Xo(this,{idToken:e}),r=await ut._fromGetAccountInfoResponse(this,t,e);await this.directlySetCurrentUser(r)}catch(t){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",t),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){if(qe(this.app)){const s=this.app.settings.authIdToken;return s?new Promise(o=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(s).then(o,o))}):this.directlySetCurrentUser(null)}const t=await this.assertedPersistence.getCurrentUser();let r=t,i=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const s=this.redirectUser?._redirectEventId,o=r?._redirectEventId,c=await this.tryRedirectSignIn(e);(!s||s===o)&&c?.user&&(r=c.user,i=!0)}if(!r)return this.directlySetCurrentUser(null);if(!r._redirectEventId){if(i)try{await this.beforeStateQueue.runMiddleware(r)}catch(s){r=t,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(s))}return r?this.reloadAndSetCurrentUserOrClear(r):this.directlySetCurrentUser(null)}return $(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===r._redirectEventId?this.directlySetCurrentUser(r):this.reloadAndSetCurrentUserOrClear(r)}async tryRedirectSignIn(e){let t=null;try{t=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return t}async reloadAndSetCurrentUserOrClear(e){try{await Zo(e)}catch(t){if(t?.code!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=Ob()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(qe(this.app))return Promise.reject(Dt(this));const t=e?K(e):null;return t&&$(t.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(t&&t._clone(this))}async _updateCurrentUser(e,t=!1){if(!this._deleted)return e&&$(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),t||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return qe(this.app)?Promise.reject(Dt(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return qe(this.app)?Promise.reject(Dt(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(Ct(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const t=this._getPasswordPolicyInternal();return t.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):t.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await Zb(this),t=new tR(e);this.tenantId===null?this._projectPasswordPolicy=t:this._tenantPasswordPolicies[this.tenantId]=t}_getPersistenceType(){return this.assertedPersistence.persistence.type}_getPersistence(){return this.assertedPersistence.persistence}_updateErrorMap(e){this._errorFactory=new yn("auth","Firebase",e())}onAuthStateChanged(e,t,r){return this.registerStateListener(this.authStateSubscription,e,t,r)}beforeAuthStateChanged(e,t){return this.beforeStateQueue.pushCallback(e,t)}onIdTokenChanged(e,t,r){return this.registerStateListener(this.idTokenSubscription,e,t,r)}authStateReady(){return new Promise((e,t)=>{if(this.currentUser)e();else{const r=this.onAuthStateChanged(()=>{r(),e()},t)}})}async revokeAccessToken(e){if(this.currentUser){const t=await this.currentUser.getIdToken(),r={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:t};this.tenantId!=null&&(r.tenantId=this.tenantId),await Qb(this,r)}}toJSON(){return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:this._currentUser?.toJSON()}}async _setRedirectUser(e,t){const r=await this.getOrInitRedirectPersistenceManager(t);return e===null?r.removeCurrentUser():r.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const t=e&&Ct(e)||this._popupRedirectResolver;$(t,this,"argument-error"),this.redirectPersistenceManager=await Sr.create(this,[Ct(t._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){return this._isInitialized&&await this.queue(async()=>{}),this._currentUser?._redirectEventId===e?this._currentUser:this.redirectUser?._redirectEventId===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const e=this.currentUser?.uid??null;this.lastNotifiedUid!==e&&(this.lastNotifiedUid=e,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,t,r,i){if(this._deleted)return()=>{};const s=typeof t=="function"?t:t.next.bind(t);let o=!1;const c=this._isInitialized?Promise.resolve():this._initializationPromise;if($(c,this,"internal-error"),c.then(()=>{o||s(this.currentUser)}),typeof t=="function"){const u=e.addObserver(t,r,i);return()=>{o=!0,u()}}else{const u=e.addObserver(t);return()=>{o=!0,u()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return $(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=J_(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){const e={"X-Client-Version":this.clientVersion};this.app.options.appId&&(e["X-Firebase-gmpid"]=this.app.options.appId);const t=await this.heartbeatServiceProvider.getImmediate({optional:!0})?.getHeartbeatsHeader();t&&(e["X-Firebase-Client"]=t);const r=await this._getAppCheckToken();return r&&(e["X-Firebase-AppCheck"]=r),e}async _getAppCheckToken(){if(qe(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=await this.appCheckServiceProvider.getImmediate({optional:!0})?.getToken();return e?.error&&Db(`Error while retrieving App Check token: ${e.error}`),e?.token}}function An(n){return K(n)}class sp{constructor(e){this.auth=e,this.observer=null,this.addObserver=RT(t=>this.observer=t)}get next(){return $(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
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
 */let Va={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function rR(n){Va=n}function Y_(n){return Va.loadJS(n)}function iR(){return Va.recaptchaEnterpriseScript}function sR(){return Va.gapiScript}function oR(n){return`__${n}${Math.floor(Math.random()*1e6)}`}class aR{constructor(){this.enterprise=new cR}ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}class cR{ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}const uR="recaptcha-enterprise",X_="NO_RECAPTCHA";class lR{constructor(e){this.type=uR,this.auth=An(e)}async verify(e="verify",t=!1){async function r(s){if(!t){if(s.tenantId==null&&s._agentRecaptchaConfig!=null)return s._agentRecaptchaConfig.siteKey;if(s.tenantId!=null&&s._tenantRecaptchaConfigs[s.tenantId]!==void 0)return s._tenantRecaptchaConfigs[s.tenantId].siteKey}return new Promise(async(o,c)=>{$b(s,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}).then(u=>{if(u.recaptchaKey===void 0)c(new Error("recaptcha Enterprise site key undefined"));else{const l=new Bb(u);return s.tenantId==null?s._agentRecaptchaConfig=l:s._tenantRecaptchaConfigs[s.tenantId]=l,o(l.siteKey)}}).catch(u=>{c(u)})})}function i(s,o,c){const u=window.grecaptcha;ep(u)?u.enterprise.ready(()=>{u.enterprise.execute(s,{action:e}).then(l=>{o(l)}).catch(()=>{o(X_)})}):c(Error("No reCAPTCHA enterprise script loaded."))}return this.auth.settings.appVerificationDisabledForTesting?new aR().execute("siteKey",{action:"verify"}):new Promise((s,o)=>{r(this.auth).then(c=>{if(!t&&ep(window.grecaptcha))i(c,s,o);else{if(typeof window>"u"){o(new Error("RecaptchaVerifier is only supported in browser"));return}let u=iR();u.length!==0&&(u+=c),Y_(u).then(()=>{i(c,s,o)}).catch(l=>{o(l)})}}).catch(c=>{o(c)})})}}async function op(n,e,t,r=!1,i=!1){const s=new lR(n);let o;if(i)o=X_;else try{o=await s.verify(t)}catch{o=await s.verify(t,!0)}const c={...e};if(t==="mfaSmsEnrollment"||t==="mfaSmsSignIn"){if("phoneEnrollmentInfo"in c){const u=c.phoneEnrollmentInfo.phoneNumber,l=c.phoneEnrollmentInfo.recaptchaToken;Object.assign(c,{phoneEnrollmentInfo:{phoneNumber:u,recaptchaToken:l,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}else if("phoneSignInInfo"in c){const u=c.phoneSignInInfo.recaptchaToken;Object.assign(c,{phoneSignInInfo:{recaptchaToken:u,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}return c}return r?Object.assign(c,{captchaResp:o}):Object.assign(c,{captchaResponse:o}),Object.assign(c,{clientType:"CLIENT_TYPE_WEB"}),Object.assign(c,{recaptchaVersion:"RECAPTCHA_ENTERPRISE"}),c}async function Tu(n,e,t,r,i){if(n._getRecaptchaConfig()?.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")){const s=await op(n,e,t,t==="getOobCode");return r(n,s)}else return r(n,e).catch(async s=>{if(s.code==="auth/missing-recaptcha-token"){console.log(`${t} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`);const o=await op(n,e,t,t==="getOobCode");return r(n,o)}else return Promise.reject(s)})}/**
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
 */function hR(n,e){const t=Rt(n,"auth");if(t.isInitialized()){const i=t.getImmediate(),s=t.getOptions();if(hn(s,e??{}))return i;st(i,"already-initialized")}return t.initialize({options:e})}function dR(n,e){const t=e?.persistence||[],r=(Array.isArray(t)?t:[t]).map(Ct);e?.errorMap&&n._updateErrorMap(e.errorMap),n._initializeWithPersistence(r,e?.popupRedirectResolver)}function fR(n,e,t){const r=An(n);$(/^https?:\/\//.test(e),r,"invalid-emulator-scheme");const i=!1,s=Z_(e),{host:o,port:c}=pR(e),u=c===null?"":`:${c}`,l={url:`${s}//${o}${u}/`},f=Object.freeze({host:o,port:c,protocol:s.replace(":",""),options:Object.freeze({disableWarnings:i})});if(!r._canInitEmulator){$(r.config.emulator&&r.emulatorConfig,r,"emulator-config-failed"),$(hn(l,r.config.emulator)&&hn(f,r.emulatorConfig),r,"emulator-config-failed");return}r.config.emulator=l,r.emulatorConfig=f,r.settings.appVerificationDisabledForTesting=!0,bt(o)?(ua(`${s}//${o}${u}`),Nu("Auth",!0)):mR()}function Z_(n){const e=n.indexOf(":");return e<0?"":n.substr(0,e+1)}function pR(n){const e=Z_(n),t=/(\/\/)?([^?#/]+)/.exec(n.substr(e.length));if(!t)return{host:"",port:null};const r=t[2].split("@").pop()||"",i=/^(\[[^\]]+\])(:|$)/.exec(r);if(i){const s=i[1];return{host:s,port:ap(r.substr(s.length+1))}}else{const[s,o]=r.split(":");return{host:s,port:ap(o)}}}function ap(n){if(!n)return null;const e=Number(n);return isNaN(e)?null:e}function mR(){function n(){const e=document.createElement("p"),t=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",t.position="fixed",t.width="100%",t.backgroundColor="#ffffff",t.border=".1em solid #000000",t.color="#b50000",t.bottom="0px",t.left="0px",t.margin="0px",t.zIndex="10000",t.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",n):n())}/**
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
 */class Bl{constructor(e,t){this.providerId=e,this.signInMethod=t}toJSON(){return Pt("not implemented")}_getIdTokenResponse(e){return Pt("not implemented")}_linkToIdToken(e,t){return Pt("not implemented")}_getReauthenticationResolver(e){return Pt("not implemented")}}/**
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
 */async function ey(n,e){return ot(n,"POST","/v1/accounts:resetPassword",ft(n,e))}async function gR(n,e){return ot(n,"POST","/v1/accounts:signUp",e)}async function _R(n,e){return ot(n,"POST","/v1/accounts:update",ft(n,e))}/**
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
 */async function yR(n,e){return xs(n,"POST","/v1/accounts:signInWithPassword",ft(n,e))}async function IR(n,e){return ot(n,"POST","/v1/accounts:sendOobCode",ft(n,e))}async function TR(n,e){return IR(n,e)}/**
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
 */async function ER(n,e){return xs(n,"POST","/v1/accounts:signInWithEmailLink",ft(n,e))}async function wR(n,e){return xs(n,"POST","/v1/accounts:signInWithEmailLink",ft(n,e))}/**
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
 */class ms extends Bl{constructor(e,t,r,i=null){super("password",r),this._email=e,this._password=t,this._tenantId=i}static _fromEmailAndPassword(e,t){return new ms(e,t,"password")}static _fromEmailAndCode(e,t,r=null){return new ms(e,t,"emailLink",r)}toJSON(){return{email:this._email,password:this._password,signInMethod:this.signInMethod,tenantId:this._tenantId}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e;if(t?.email&&t?.password){if(t.signInMethod==="password")return this._fromEmailAndPassword(t.email,t.password);if(t.signInMethod==="emailLink")return this._fromEmailAndCode(t.email,t.password,t.tenantId)}return null}async _getIdTokenResponse(e){switch(this.signInMethod){case"password":const t={returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return Tu(e,t,"signInWithPassword",yR);case"emailLink":return ER(e,{email:this._email,oobCode:this._password});default:st(e,"internal-error")}}async _linkToIdToken(e,t){switch(this.signInMethod){case"password":const r={idToken:t,returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return Tu(e,r,"signUpPassword",gR);case"emailLink":return wR(e,{idToken:t,email:this._email,oobCode:this._password});default:st(e,"internal-error")}}_getReauthenticationResolver(e){return this._getIdTokenResponse(e)}}/**
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
 */async function Pr(n,e){return xs(n,"POST","/v1/accounts:signInWithIdp",ft(n,e))}/**
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
 */const vR="http://localhost";class er extends Bl{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const t=new er(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(t.idToken=e.idToken),e.accessToken&&(t.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(t.nonce=e.nonce),e.pendingToken&&(t.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(t.accessToken=e.oauthToken,t.secret=e.oauthTokenSecret):st("argument-error"),t}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e,{providerId:r,signInMethod:i,...s}=t;if(!r||!i)return null;const o=new er(r,i);return o.idToken=s.idToken||void 0,o.accessToken=s.accessToken||void 0,o.secret=s.secret,o.nonce=s.nonce,o.pendingToken=s.pendingToken||null,o}_getIdTokenResponse(e){const t=this.buildRequest();return Pr(e,t)}_linkToIdToken(e,t){const r=this.buildRequest();return r.idToken=t,Pr(e,r)}_getReauthenticationResolver(e){const t=this.buildRequest();return t.autoCreate=!1,Pr(e,t)}buildRequest(){const e={requestUri:vR,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const t={};this.idToken&&(t.id_token=this.idToken),this.accessToken&&(t.access_token=this.accessToken),this.secret&&(t.oauth_token_secret=this.secret),t.providerId=this.providerId,this.nonce&&!this.pendingToken&&(t.nonce=this.nonce),e.postBody=ys(t)}return e}}/**
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
 */function AR(n){switch(n){case"recoverEmail":return"RECOVER_EMAIL";case"resetPassword":return"PASSWORD_RESET";case"signIn":return"EMAIL_SIGNIN";case"verifyEmail":return"VERIFY_EMAIL";case"verifyAndChangeEmail":return"VERIFY_AND_CHANGE_EMAIL";case"revertSecondFactorAddition":return"REVERT_SECOND_FACTOR_ADDITION";default:return null}}function bR(n){const e=Ni(Vi(n)).link,t=e?Ni(Vi(e)).deep_link_id:null,r=Ni(Vi(n)).deep_link_id;return(r?Ni(Vi(r)).link:null)||r||t||e||n}class $l{constructor(e){const t=Ni(Vi(e)),r=t.apiKey??null,i=t.oobCode??null,s=AR(t.mode??null);$(r&&i&&s,"argument-error"),this.apiKey=r,this.operation=s,this.code=i,this.continueUrl=t.continueUrl??null,this.languageCode=t.lang??null,this.tenantId=t.tenantId??null}static parseLink(e){const t=bR(e);try{return new $l(t)}catch{return null}}}/**
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
 */class ai{constructor(){this.providerId=ai.PROVIDER_ID}static credential(e,t){return ms._fromEmailAndPassword(e,t)}static credentialWithLink(e,t){const r=$l.parseLink(t);return $(r,"argument-error"),ms._fromEmailAndCode(e,r.code,r.tenantId)}}ai.PROVIDER_ID="password";ai.EMAIL_PASSWORD_SIGN_IN_METHOD="password";ai.EMAIL_LINK_SIGN_IN_METHOD="emailLink";/**
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
 */class ty{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}/**
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
 */class Ms extends ty{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}/**
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
 */class Jt extends Ms{constructor(){super("facebook.com")}static credential(e){return er._fromParams({providerId:Jt.PROVIDER_ID,signInMethod:Jt.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return Jt.credentialFromTaggedObject(e)}static credentialFromError(e){return Jt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return Jt.credential(e.oauthAccessToken)}catch{return null}}}Jt.FACEBOOK_SIGN_IN_METHOD="facebook.com";Jt.PROVIDER_ID="facebook.com";/**
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
 */class Yt extends Ms{constructor(){super("google.com"),this.addScope("profile")}static credential(e,t){return er._fromParams({providerId:Yt.PROVIDER_ID,signInMethod:Yt.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:t})}static credentialFromResult(e){return Yt.credentialFromTaggedObject(e)}static credentialFromError(e){return Yt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:r}=e;if(!t&&!r)return null;try{return Yt.credential(t,r)}catch{return null}}}Yt.GOOGLE_SIGN_IN_METHOD="google.com";Yt.PROVIDER_ID="google.com";/**
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
 */class Xt extends Ms{constructor(){super("github.com")}static credential(e){return er._fromParams({providerId:Xt.PROVIDER_ID,signInMethod:Xt.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return Xt.credentialFromTaggedObject(e)}static credentialFromError(e){return Xt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return Xt.credential(e.oauthAccessToken)}catch{return null}}}Xt.GITHUB_SIGN_IN_METHOD="github.com";Xt.PROVIDER_ID="github.com";/**
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
 */class Zt extends Ms{constructor(){super("twitter.com")}static credential(e,t){return er._fromParams({providerId:Zt.PROVIDER_ID,signInMethod:Zt.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:t})}static credentialFromResult(e){return Zt.credentialFromTaggedObject(e)}static credentialFromError(e){return Zt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthAccessToken:t,oauthTokenSecret:r}=e;if(!t||!r)return null;try{return Zt.credential(t,r)}catch{return null}}}Zt.TWITTER_SIGN_IN_METHOD="twitter.com";Zt.PROVIDER_ID="twitter.com";/**
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
 */async function RR(n,e){return xs(n,"POST","/v1/accounts:signUp",ft(n,e))}/**
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
 */class tr{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,t,r,i=!1){const s=await ut._fromIdTokenResponse(e,r,i),o=cp(r);return new tr({user:s,providerId:o,_tokenResponse:r,operationType:t})}static async _forOperation(e,t,r){await e._updateTokensIfNecessary(r,!0);const i=cp(r);return new tr({user:e,providerId:i,_tokenResponse:r,operationType:t})}}function cp(n){return n.providerId?n.providerId:"phoneNumber"in n?"phone":null}/**
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
 */class ea extends rt{constructor(e,t,r,i){super(t.code,t.message),this.operationType=r,this.user=i,Object.setPrototypeOf(this,ea.prototype),this.customData={appName:e.name,tenantId:e.tenantId??void 0,_serverResponse:t.customData._serverResponse,operationType:r}}static _fromErrorAndOperation(e,t,r,i){return new ea(e,t,r,i)}}function ny(n,e,t,r){return(e==="reauthenticate"?t._getReauthenticationResolver(n):t._getIdTokenResponse(n)).catch(s=>{throw s.code==="auth/multi-factor-auth-required"?ea._fromErrorAndOperation(n,s,e,r):s})}async function SR(n,e,t=!1){const r=await Jr(n,e._linkToIdToken(n.auth,await n.getIdToken()),t);return tr._forOperation(n,"link",r)}/**
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
 */async function PR(n,e,t=!1){const{auth:r}=n;if(qe(r.app))return Promise.reject(Dt(r));const i="reauthenticate";try{const s=await Jr(n,ny(r,i,e,n),t);$(s.idToken,r,"internal-error");const o=Fl(s.idToken);$(o,r,"internal-error");const{sub:c}=o;return $(n.uid===c,r,"user-mismatch"),tr._forOperation(n,i,s)}catch(s){throw s?.code==="auth/user-not-found"&&st(r,"user-mismatch"),s}}/**
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
 */async function ry(n,e,t=!1){if(qe(n.app))return Promise.reject(Dt(n));const r="signIn",i=await ny(n,r,e),s=await tr._fromIdTokenResponse(n,r,i);return t||await n._updateCurrentUser(s.user),s}async function CR(n,e){return ry(An(n),e)}/**
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
 */class ql{constructor(e,t){this.factorId=e,this.uid=t.mfaEnrollmentId,this.enrollmentTime=new Date(t.enrolledAt).toUTCString(),this.displayName=t.displayName}static _fromServerResponse(e,t){return"phoneInfo"in t?jl._fromServerResponse(e,t):"totpInfo"in t?zl._fromServerResponse(e,t):st(e,"internal-error")}}class jl extends ql{constructor(e){super("phone",e),this.phoneNumber=e.phoneInfo}static _fromServerResponse(e,t){return new jl(t)}}class zl extends ql{constructor(e){super("totp",e)}static _fromServerResponse(e,t){return new zl(t)}}/**
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
 */function kR(n,e,t){$(t.url?.length>0,n,"invalid-continue-uri"),$(typeof t.dynamicLinkDomain>"u"||t.dynamicLinkDomain.length>0,n,"invalid-dynamic-link-domain"),$(typeof t.linkDomain>"u"||t.linkDomain.length>0,n,"invalid-hosting-link-domain"),e.continueUrl=t.url,e.dynamicLinkDomain=t.dynamicLinkDomain,e.linkDomain=t.linkDomain,e.canHandleCodeInApp=t.handleCodeInApp,t.iOS&&($(t.iOS.bundleId.length>0,n,"missing-ios-bundle-id"),e.iOSBundleId=t.iOS.bundleId),t.android&&($(t.android.packageName.length>0,n,"missing-android-pkg-name"),e.androidInstallApp=t.android.installApp,e.androidMinimumVersionCode=t.android.minimumVersion,e.androidPackageName=t.android.packageName)}/**
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
 */async function Gl(n){const e=An(n);e._getPasswordPolicyInternal()&&await e._updatePasswordPolicy()}async function PD(n,e,t){await ey(K(n),{oobCode:e,newPassword:t}).catch(async r=>{throw r.code==="auth/password-does-not-meet-requirements"&&Gl(n),r})}async function CD(n,e){await _R(K(n),{oobCode:e})}async function DR(n,e){const t=K(n),r=await ey(t,{oobCode:e}),i=r.requestType;switch($(i,t,"internal-error"),i){case"EMAIL_SIGNIN":break;case"VERIFY_AND_CHANGE_EMAIL":$(r.newEmail,t,"internal-error");break;case"REVERT_SECOND_FACTOR_ADDITION":$(r.mfaInfo,t,"internal-error");default:$(r.email,t,"internal-error")}let s=null;return r.mfaInfo&&(s=ql._fromServerResponse(An(t),r.mfaInfo)),{data:{email:(r.requestType==="VERIFY_AND_CHANGE_EMAIL"?r.newEmail:r.email)||null,previousEmail:(r.requestType==="VERIFY_AND_CHANGE_EMAIL"?r.email:r.newEmail)||null,multiFactorInfo:s},operation:i}}async function kD(n,e){const{data:t}=await DR(K(n),e);return t.email}async function DD(n,e,t){if(qe(n.app))return Promise.reject(Dt(n));const r=An(n),o=await Tu(r,{returnSecureToken:!0,email:e,password:t,clientType:"CLIENT_TYPE_WEB"},"signUpPassword",RR).catch(u=>{throw u.code==="auth/password-does-not-meet-requirements"&&Gl(n),u}),c=await tr._fromIdTokenResponse(r,"signIn",o);return await r._updateCurrentUser(c.user),c}function ND(n,e,t){return qe(n.app)?Promise.reject(Dt(n)):CR(K(n),ai.credential(e,t)).catch(async r=>{throw r.code==="auth/password-does-not-meet-requirements"&&Gl(n),r})}async function VD(n,e){const t=K(n),i={requestType:"VERIFY_EMAIL",idToken:await n.getIdToken()};e&&kR(t.auth,i,e);const{email:s}=await TR(t.auth,i);s!==n.email&&await n.reload()}/**
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
 */async function NR(n,e){return ot(n,"POST","/v1/accounts:update",e)}/**
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
 */async function OD(n,{displayName:e,photoURL:t}){if(e===void 0&&t===void 0)return;const r=K(n),s={idToken:await r.getIdToken(),displayName:e,photoUrl:t,returnSecureToken:!0},o=await Jr(r,NR(r.auth,s));r.displayName=o.displayName||null,r.photoURL=o.photoUrl||null;const c=r.providerData.find(({providerId:u})=>u==="password");c&&(c.displayName=r.displayName,c.photoURL=r.photoURL),await r._updateTokensIfNecessary(o)}/**
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
 */function xD(n,e){return K(n).setPersistence(e)}function VR(n,e,t,r){return K(n).onIdTokenChanged(e,t,r)}function OR(n,e,t){return K(n).beforeAuthStateChanged(e,t)}function MD(n,e,t,r){return K(n).onAuthStateChanged(e,t,r)}function LD(n){return K(n).signOut()}const ta="__sak";/**
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
 */class iy{constructor(e,t){this.storageRetriever=e,this.type=t}_isAvailable(){try{return this.storage?(this.storage.setItem(ta,"1"),this.storage.removeItem(ta),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,t){return this.storage.setItem(e,JSON.stringify(t)),Promise.resolve()}_get(e){const t=this.storage.getItem(e);return Promise.resolve(t?JSON.parse(t):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}}/**
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
 */const xR=1e3,MR=10;class sy extends iy{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,t)=>this.onStorageEvent(e,t),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=Q_(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const t of Object.keys(this.listeners)){const r=this.storage.getItem(t),i=this.localCache[t];r!==i&&e(t,i,r)}}onStorageEvent(e,t=!1){if(!e.key){this.forAllChangedKeys((o,c,u)=>{this.notifyListeners(o,u)});return}const r=e.key;t?this.detachListener():this.stopPolling();const i=()=>{const o=this.storage.getItem(r);!t&&this.localCache[r]===o||this.notifyListeners(r,o)},s=this.storage.getItem(r);Yb()&&s!==e.newValue&&e.newValue!==e.oldValue?setTimeout(i,MR):i()}notifyListeners(e,t){this.localCache[e]=t;const r=this.listeners[e];if(r)for(const i of Array.from(r))i(t&&JSON.parse(t))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,t,r)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:t,newValue:r}),!0)})},xR)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,t){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,t){await super._set(e,t),this.localCache[e]=JSON.stringify(t)}async _get(e){const t=await super._get(e);return this.localCache[e]=JSON.stringify(t),t}async _remove(e){await super._remove(e),delete this.localCache[e]}}sy.type="LOCAL";const LR=sy;/**
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
 */class oy extends iy{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,t){}_removeListener(e,t){}}oy.type="SESSION";const ay=oy;/**
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
 */function FR(n){return Promise.all(n.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(t){return{fulfilled:!1,reason:t}}}))}/**
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
 */class Oa{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const t=this.receivers.find(i=>i.isListeningto(e));if(t)return t;const r=new Oa(e);return this.receivers.push(r),r}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const t=e,{eventId:r,eventType:i,data:s}=t.data,o=this.handlersMap[i];if(!o?.size)return;t.ports[0].postMessage({status:"ack",eventId:r,eventType:i});const c=Array.from(o).map(async l=>l(t.origin,s)),u=await FR(c);t.ports[0].postMessage({status:"done",eventId:r,eventType:i,response:u})}_subscribe(e,t){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(t)}_unsubscribe(e,t){this.handlersMap[e]&&t&&this.handlersMap[e].delete(t),(!t||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}Oa.receivers=[];/**
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
 */function Kl(n="",e=10){let t="";for(let r=0;r<e;r++)t+=Math.floor(Math.random()*10);return n+t}/**
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
 */class UR{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,t,r=50){const i=typeof MessageChannel<"u"?new MessageChannel:null;if(!i)throw new Error("connection_unavailable");let s,o;return new Promise((c,u)=>{const l=Kl("",20);i.port1.start();const f=setTimeout(()=>{u(new Error("unsupported_event"))},r);o={messageChannel:i,onMessage(p){const g=p;if(g.data.eventId===l)switch(g.data.status){case"ack":clearTimeout(f),s=setTimeout(()=>{u(new Error("timeout"))},3e3);break;case"done":clearTimeout(s),c(g.data.response);break;default:clearTimeout(f),clearTimeout(s),u(new Error("invalid_response"));break}}},this.handlers.add(o),i.port1.addEventListener("message",o.onMessage),this.target.postMessage({eventType:e,eventId:l,data:t},[i.port2])}).finally(()=>{o&&this.removeMessageHandler(o)})}}/**
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
 */function vt(){return window}function BR(n){vt().location.href=n}/**
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
 */function cy(){return typeof vt().WorkerGlobalScope<"u"&&typeof vt().importScripts=="function"}async function $R(){if(!navigator?.serviceWorker)return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function qR(){return navigator?.serviceWorker?.controller||null}function jR(){return cy()?self:null}/**
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
 */const uy="firebaseLocalStorageDb",zR=1,na="firebaseLocalStorage",ly="fbase_key";class Ls{constructor(e){this.request=e}toPromise(){return new Promise((e,t)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{t(this.request.error)})})}}function xa(n,e){return n.transaction([na],e?"readwrite":"readonly").objectStore(na)}function GR(){const n=indexedDB.deleteDatabase(uy);return new Ls(n).toPromise()}function Eu(){const n=indexedDB.open(uy,zR);return new Promise((e,t)=>{n.addEventListener("error",()=>{t(n.error)}),n.addEventListener("upgradeneeded",()=>{const r=n.result;try{r.createObjectStore(na,{keyPath:ly})}catch(i){t(i)}}),n.addEventListener("success",async()=>{const r=n.result;r.objectStoreNames.contains(na)?e(r):(r.close(),await GR(),e(await Eu()))})})}async function up(n,e,t){const r=xa(n,!0).put({[ly]:e,value:t});return new Ls(r).toPromise()}async function KR(n,e){const t=xa(n,!1).get(e),r=await new Ls(t).toPromise();return r===void 0?null:r.value}function lp(n,e){const t=xa(n,!0).delete(e);return new Ls(t).toPromise()}const HR=800,WR=3;class hy{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db?this.db:(this.db=await Eu(),this.db)}async _withRetries(e){let t=0;for(;;)try{const r=await this._openDb();return await e(r)}catch(r){if(t++>WR)throw r;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return cy()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=Oa._getInstance(jR()),this.receiver._subscribe("keyChanged",async(e,t)=>({keyProcessed:(await this._poll()).includes(t.key)})),this.receiver._subscribe("ping",async(e,t)=>["keyChanged"])}async initializeSender(){if(this.activeServiceWorker=await $R(),!this.activeServiceWorker)return;this.sender=new UR(this.activeServiceWorker);const e=await this.sender._send("ping",{},800);e&&e[0]?.fulfilled&&e[0]?.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||qR()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{if(!indexedDB)return!1;const e=await Eu();return await up(e,ta,"1"),await lp(e,ta),!0}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,t){return this._withPendingWrite(async()=>(await this._withRetries(r=>up(r,e,t)),this.localCache[e]=t,this.notifyServiceWorker(e)))}async _get(e){const t=await this._withRetries(r=>KR(r,e));return this.localCache[e]=t,t}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(t=>lp(t,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){const e=await this._withRetries(i=>{const s=xa(i,!1).getAll();return new Ls(s).toPromise()});if(!e)return[];if(this.pendingWrites!==0)return[];const t=[],r=new Set;if(e.length!==0)for(const{fbase_key:i,value:s}of e)r.add(i),JSON.stringify(this.localCache[i])!==JSON.stringify(s)&&(this.notifyListeners(i,s),t.push(i));for(const i of Object.keys(this.localCache))this.localCache[i]&&!r.has(i)&&(this.notifyListeners(i,null),t.push(i));return t}notifyListeners(e,t){this.localCache[e]=t;const r=this.listeners[e];if(r)for(const i of Array.from(r))i(t)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),HR)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,t){Object.keys(this.listeners).length===0&&this.startPolling(),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&this.stopPolling()}}hy.type="LOCAL";const QR=hy;new Os(3e4,6e4);/**
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
 */function JR(n,e){return e?Ct(e):($(n._popupRedirectResolver,n,"argument-error"),n._popupRedirectResolver)}/**
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
 */class Hl extends Bl{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return Pr(e,this._buildIdpRequest())}_linkToIdToken(e,t){return Pr(e,this._buildIdpRequest(t))}_getReauthenticationResolver(e){return Pr(e,this._buildIdpRequest())}_buildIdpRequest(e){const t={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(t.idToken=e),t}}function YR(n){return ry(n.auth,new Hl(n),n.bypassAuthState)}function XR(n){const{auth:e,user:t}=n;return $(t,e,"internal-error"),PR(t,new Hl(n),n.bypassAuthState)}async function ZR(n){const{auth:e,user:t}=n;return $(t,e,"internal-error"),SR(t,new Hl(n),n.bypassAuthState)}/**
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
 */class dy{constructor(e,t,r,i,s=!1){this.auth=e,this.resolver=r,this.user=i,this.bypassAuthState=s,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(t)?t:[t]}execute(){return new Promise(async(e,t)=>{this.pendingPromise={resolve:e,reject:t};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(r){this.reject(r)}})}async onAuthEvent(e){const{urlResponse:t,sessionId:r,postBody:i,tenantId:s,error:o,type:c}=e;if(o){this.reject(o);return}const u={auth:this.auth,requestUri:t,sessionId:r,tenantId:s||void 0,postBody:i||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(c)(u))}catch(l){this.reject(l)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return YR;case"linkViaPopup":case"linkViaRedirect":return ZR;case"reauthViaPopup":case"reauthViaRedirect":return XR;default:st(this.auth,"internal-error")}}resolve(e){xt(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){xt(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}/**
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
 */const eS=new Os(2e3,1e4);class wr extends dy{constructor(e,t,r,i,s){super(e,t,i,s),this.provider=r,this.authWindow=null,this.pollId=null,wr.currentPopupAction&&wr.currentPopupAction.cancel(),wr.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return $(e,this.auth,"internal-error"),e}async onExecution(){xt(this.filter.length===1,"Popup operations only handle one event");const e=Kl();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(t=>{this.reject(t)}),this.resolver._isIframeWebStorageSupported(this.auth,t=>{t||this.reject(wt(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){return this.authWindow?.associatedEvent||null}cancel(){this.reject(wt(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,wr.currentPopupAction=null}pollUserCancellation(){const e=()=>{if(this.authWindow?.window?.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(wt(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,eS.get())};e()}}wr.currentPopupAction=null;/**
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
 */const tS="pendingRedirect",So=new Map;class nS extends dy{constructor(e,t,r=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],t,void 0,r),this.eventId=null}async execute(){let e=So.get(this.auth._key());if(!e){try{const r=await rS(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(r)}catch(t){e=()=>Promise.reject(t)}So.set(this.auth._key(),e)}return this.bypassAuthState||So.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){const t=await this.auth._redirectUserForId(e.eventId);if(t)return this.user=t,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}}async function rS(n,e){const t=oS(e),r=sS(n);if(!await r._isAvailable())return!1;const i=await r._get(t)==="true";return await r._remove(t),i}function iS(n,e){So.set(n._key(),e)}function sS(n){return Ct(n._redirectPersistence)}function oS(n){return Ro(tS,n.config.apiKey,n.name)}async function aS(n,e,t=!1){if(qe(n.app))return Promise.reject(Dt(n));const r=An(n),i=JR(r,e),o=await new nS(r,i,t).execute();return o&&!t&&(delete o.user._redirectEventId,await r._persistUserIfCurrent(o.user),await r._setRedirectUser(null,e)),o}/**
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
 */const cS=600*1e3;class uS{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let t=!1;return this.consumers.forEach(r=>{this.isEventForConsumer(e,r)&&(t=!0,this.sendToConsumer(e,r),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!lS(e)||(this.hasHandledPotentialRedirect=!0,t||(this.queuedRedirectEvent=e,t=!0)),t}sendToConsumer(e,t){if(e.error&&!fy(e)){const r=e.error.code?.split("auth/")[1]||"internal-error";t.onError(wt(this.auth,r))}else t.onAuthEvent(e)}isEventForConsumer(e,t){const r=t.eventId===null||!!e.eventId&&e.eventId===t.eventId;return t.filter.includes(e.type)&&r}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=cS&&this.cachedEventUids.clear(),this.cachedEventUids.has(hp(e))}saveEventToCache(e){this.cachedEventUids.add(hp(e)),this.lastProcessedEventTime=Date.now()}}function hp(n){return[n.type,n.eventId,n.sessionId,n.tenantId].filter(e=>e).join("-")}function fy({type:n,error:e}){return n==="unknown"&&e?.code==="auth/no-auth-event"}function lS(n){switch(n.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return fy(n);default:return!1}}/**
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
 */async function hS(n,e={}){return ot(n,"GET","/v1/projects",e)}/**
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
 */const dS=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,fS=/^https?/;async function pS(n){if(n.config.emulator)return;const{authorizedDomains:e}=await hS(n);for(const t of e)try{if(mS(t))return}catch{}st(n,"unauthorized-domain")}function mS(n){const e=yu(),{protocol:t,hostname:r}=new URL(e);if(n.startsWith("chrome-extension://")){const o=new URL(n);return o.hostname===""&&r===""?t==="chrome-extension:"&&n.replace("chrome-extension://","")===e.replace("chrome-extension://",""):t==="chrome-extension:"&&o.hostname===r}if(!fS.test(t))return!1;if(dS.test(n))return r===n;const i=n.replace(/\./g,"\\.");return new RegExp("^(.+\\."+i+"|"+i+")$","i").test(r)}/**
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
 */const gS=new Os(3e4,6e4);function dp(){const n=vt().___jsl;if(n?.H){for(const e of Object.keys(n.H))if(n.H[e].r=n.H[e].r||[],n.H[e].L=n.H[e].L||[],n.H[e].r=[...n.H[e].L],n.CP)for(let t=0;t<n.CP.length;t++)n.CP[t]=null}}function _S(n){return new Promise((e,t)=>{function r(){dp(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{dp(),t(wt(n,"network-request-failed"))},timeout:gS.get()})}if(vt().gapi?.iframes?.Iframe)e(gapi.iframes.getContext());else if(vt().gapi?.load)r();else{const i=oR("iframefcb");return vt()[i]=()=>{gapi.load?r():t(wt(n,"network-request-failed"))},Y_(`${sR()}?onload=${i}`).catch(s=>t(s))}}).catch(e=>{throw Po=null,e})}let Po=null;function yS(n){return Po=Po||_S(n),Po}/**
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
 */const IS=new Os(5e3,15e3),TS="__/auth/iframe",ES="emulator/auth/iframe",wS={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},vS=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function AS(n){const e=n.config;$(e.authDomain,n,"auth-domain-config-required");const t=e.emulator?Ll(e,ES):`https://${n.config.authDomain}/${TS}`,r={apiKey:e.apiKey,appName:n.name,v:sr},i=vS.get(n.config.apiHost);i&&(r.eid=i);const s=n._getFrameworks();return s.length&&(r.fw=s.join(",")),`${t}?${ys(r).slice(1)}`}async function bS(n){const e=await yS(n),t=vt().gapi;return $(t,n,"internal-error"),e.open({where:document.body,url:AS(n),messageHandlersFilter:t.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:wS,dontclear:!0},r=>new Promise(async(i,s)=>{await r.restyle({setHideOnLeave:!1});const o=wt(n,"network-request-failed"),c=vt().setTimeout(()=>{s(o)},IS.get());function u(){vt().clearTimeout(c),i(r)}r.ping(u).then(u,()=>{s(o)})}))}/**
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
 */const RS={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},SS=500,PS=600,CS="_blank",kS="http://localhost";class fp{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}}function DS(n,e,t,r=SS,i=PS){const s=Math.max((window.screen.availHeight-i)/2,0).toString(),o=Math.max((window.screen.availWidth-r)/2,0).toString();let c="";const u={...RS,width:r.toString(),height:i.toString(),top:s,left:o},l=Ee().toLowerCase();t&&(c=z_(l)?CS:t),q_(l)&&(e=e||kS,u.scrollbars="yes");const f=Object.entries(u).reduce((g,[A,C])=>`${g}${A}=${C},`,"");if(Jb(l)&&c!=="_self")return NS(e||"",c),new fp(null);const p=window.open(e||"",c,f);$(p,n,"popup-blocked");try{p.focus()}catch{}return new fp(p)}function NS(n,e){const t=document.createElement("a");t.href=n,t.target=e;const r=document.createEvent("MouseEvent");r.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),t.dispatchEvent(r)}/**
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
 */const VS="__/auth/handler",OS="emulator/auth/handler",xS=encodeURIComponent("fac");async function pp(n,e,t,r,i,s){$(n.config.authDomain,n,"auth-domain-config-required"),$(n.config.apiKey,n,"invalid-api-key");const o={apiKey:n.config.apiKey,appName:n.name,authType:t,redirectUrl:r,v:sr,eventId:i};if(e instanceof ty){e.setDefaultLanguage(n.languageCode),o.providerId=e.providerId||"",bT(e.getCustomParameters())||(o.customParameters=JSON.stringify(e.getCustomParameters()));for(const[f,p]of Object.entries({}))o[f]=p}if(e instanceof Ms){const f=e.getScopes().filter(p=>p!=="");f.length>0&&(o.scopes=f.join(","))}n.tenantId&&(o.tid=n.tenantId);const c=o;for(const f of Object.keys(c))c[f]===void 0&&delete c[f];const u=await n._getAppCheckToken(),l=u?`#${xS}=${encodeURIComponent(u)}`:"";return`${MS(n)}?${ys(c).slice(1)}${l}`}function MS({config:n}){return n.emulator?Ll(n,OS):`https://${n.authDomain}/${VS}`}/**
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
 */const Sc="webStorageSupport";class LS{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=ay,this._completeRedirectFn=aS,this._overrideRedirectResult=iS}async _openPopup(e,t,r,i){xt(this.eventManagers[e._key()]?.manager,"_initialize() not called before _openPopup()");const s=await pp(e,t,r,yu(),i);return DS(e,s,Kl())}async _openRedirect(e,t,r,i){await this._originValidation(e);const s=await pp(e,t,r,yu(),i);return BR(s),new Promise(()=>{})}_initialize(e){const t=e._key();if(this.eventManagers[t]){const{manager:i,promise:s}=this.eventManagers[t];return i?Promise.resolve(i):(xt(s,"If manager is not set, promise should be"),s)}const r=this.initAndGetManager(e);return this.eventManagers[t]={promise:r},r.catch(()=>{delete this.eventManagers[t]}),r}async initAndGetManager(e){const t=await bS(e),r=new uS(e);return t.register("authEvent",i=>($(i?.authEvent,e,"invalid-auth-event"),{status:r.onEvent(i.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:r},this.iframes[e._key()]=t,r}_isIframeWebStorageSupported(e,t){this.iframes[e._key()].send(Sc,{type:Sc},i=>{const s=i?.[0]?.[Sc];s!==void 0&&t(!!s),st(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const t=e._key();return this.originValidationPromises[t]||(this.originValidationPromises[t]=pS(e)),this.originValidationPromises[t]}get _shouldInitProactively(){return Q_()||j_()||Ul()}}const FS=LS;var mp="@firebase/auth",gp="1.12.0";/**
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
 */class US{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){return this.assertAuthConfigured(),this.auth.currentUser?.uid||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const t=this.auth.onIdTokenChanged(r=>{e(r?.stsTokenManager.accessToken||null)});this.internalListeners.set(e,t),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const t=this.internalListeners.get(e);t&&(this.internalListeners.delete(e),t(),this.updateProactiveRefresh())}assertAuthConfigured(){$(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}/**
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
 */function BS(n){switch(n){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function $S(n){tt(new Ke("auth",(e,{options:t})=>{const r=e.getProvider("app").getImmediate(),i=e.getProvider("heartbeat"),s=e.getProvider("app-check-internal"),{apiKey:o,authDomain:c}=r.options;$(o&&!o.includes(":"),"invalid-api-key",{appName:r.name});const u={apiKey:o,authDomain:c,clientPlatform:n,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:J_(n)},l=new nR(r,i,s,u);return dR(l,t),l},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,t,r)=>{e.getProvider("auth-internal").initialize()})),tt(new Ke("auth-internal",e=>{const t=An(e.getProvider("auth").getImmediate());return(r=>new US(r))(t)},"PRIVATE").setInstantiationMode("EXPLICIT")),be(mp,gp,BS(n)),be(mp,gp,"esm2020")}/**
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
 */const qS=300,jS=im("authIdTokenMaxAge")||qS;let _p=null;const zS=n=>async e=>{const t=e&&await e.getIdTokenResult(),r=t&&(new Date().getTime()-Date.parse(t.issuedAtTime))/1e3;if(r&&r>jS)return;const i=t?.token;_p!==i&&(_p=i,await fetch(n,{method:i?"POST":"DELETE",headers:i?{Authorization:`Bearer ${i}`}:{}}))};function FD(n=Ts()){const e=Rt(n,"auth");if(e.isInitialized())return e.getImmediate();const t=hR(n,{popupRedirectResolver:FS,persistence:[QR,LR,ay]}),r=im("authTokenSyncURL");if(r&&typeof isSecureContext=="boolean"&&isSecureContext){const s=new URL(r,location.origin);if(location.origin===s.origin){const o=zS(s.toString());OR(t,o,()=>o(t.currentUser)),VR(t,c=>o(c))}}const i=tm("auth");return i&&fR(t,`http://${i}`),t}function GS(){return document.getElementsByTagName("head")?.[0]??document}rR({loadJS(n){return new Promise((e,t)=>{const r=document.createElement("script");r.setAttribute("src",n),r.onload=e,r.onerror=i=>{const s=wt("internal-error");s.customData=i,t(s)},r.type="text/javascript",r.charset="UTF-8",GS().appendChild(r)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});$S("Browser");/**
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
 */const py="firebasestorage.googleapis.com",my="storageBucket",KS=120*1e3,HS=600*1e3;/**
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
 */class pe extends rt{constructor(e,t,r=0){super(Pc(e),`Firebase Storage: ${t} (${Pc(e)})`),this.status_=r,this.customData={serverResponse:null},this._baseMessage=this.message,Object.setPrototypeOf(this,pe.prototype)}get status(){return this.status_}set status(e){this.status_=e}_codeEquals(e){return Pc(e)===this.code}get serverResponse(){return this.customData.serverResponse}set serverResponse(e){this.customData.serverResponse=e,this.customData.serverResponse?this.message=`${this._baseMessage}
${this.customData.serverResponse}`:this.message=this._baseMessage}}var fe;(function(n){n.UNKNOWN="unknown",n.OBJECT_NOT_FOUND="object-not-found",n.BUCKET_NOT_FOUND="bucket-not-found",n.PROJECT_NOT_FOUND="project-not-found",n.QUOTA_EXCEEDED="quota-exceeded",n.UNAUTHENTICATED="unauthenticated",n.UNAUTHORIZED="unauthorized",n.UNAUTHORIZED_APP="unauthorized-app",n.RETRY_LIMIT_EXCEEDED="retry-limit-exceeded",n.INVALID_CHECKSUM="invalid-checksum",n.CANCELED="canceled",n.INVALID_EVENT_NAME="invalid-event-name",n.INVALID_URL="invalid-url",n.INVALID_DEFAULT_BUCKET="invalid-default-bucket",n.NO_DEFAULT_BUCKET="no-default-bucket",n.CANNOT_SLICE_BLOB="cannot-slice-blob",n.SERVER_FILE_WRONG_SIZE="server-file-wrong-size",n.NO_DOWNLOAD_URL="no-download-url",n.INVALID_ARGUMENT="invalid-argument",n.INVALID_ARGUMENT_COUNT="invalid-argument-count",n.APP_DELETED="app-deleted",n.INVALID_ROOT_OPERATION="invalid-root-operation",n.INVALID_FORMAT="invalid-format",n.INTERNAL_ERROR="internal-error",n.UNSUPPORTED_ENVIRONMENT="unsupported-environment"})(fe||(fe={}));function Pc(n){return"storage/"+n}function Wl(){const n="An unknown error occurred, please check the error payload for server response.";return new pe(fe.UNKNOWN,n)}function WS(n){return new pe(fe.OBJECT_NOT_FOUND,"Object '"+n+"' does not exist.")}function QS(n){return new pe(fe.QUOTA_EXCEEDED,"Quota for bucket '"+n+"' exceeded, please view quota on https://firebase.google.com/pricing/.")}function JS(){const n="User is not authenticated, please authenticate using Firebase Authentication and try again.";return new pe(fe.UNAUTHENTICATED,n)}function YS(){return new pe(fe.UNAUTHORIZED_APP,"This app does not have permission to access Firebase Storage on this project.")}function XS(n){return new pe(fe.UNAUTHORIZED,"User does not have permission to access '"+n+"'.")}function ZS(){return new pe(fe.RETRY_LIMIT_EXCEEDED,"Max retry time for operation exceeded, please try again.")}function eP(){return new pe(fe.CANCELED,"User canceled the upload/download.")}function tP(n){return new pe(fe.INVALID_URL,"Invalid URL '"+n+"'.")}function nP(n){return new pe(fe.INVALID_DEFAULT_BUCKET,"Invalid default bucket '"+n+"'.")}function rP(){return new pe(fe.NO_DEFAULT_BUCKET,"No default bucket found. Did you set the '"+my+"' property when initializing the app?")}function iP(){return new pe(fe.CANNOT_SLICE_BLOB,"Cannot slice blob for upload. Please retry the upload.")}function sP(){return new pe(fe.NO_DOWNLOAD_URL,"The given file does not have any download URLs.")}function oP(n){return new pe(fe.UNSUPPORTED_ENVIRONMENT,`${n} is missing. Make sure to install the required polyfills. See https://firebase.google.com/docs/web/environments-js-sdk#polyfills for more information.`)}function wu(n){return new pe(fe.INVALID_ARGUMENT,n)}function gy(){return new pe(fe.APP_DELETED,"The Firebase app was deleted.")}function aP(n){return new pe(fe.INVALID_ROOT_OPERATION,"The operation '"+n+"' cannot be performed on a root reference, create a non-root reference using child, such as .child('file.png').")}function Qi(n,e){return new pe(fe.INVALID_FORMAT,"String does not match format '"+n+"': "+e)}function Di(n){throw new pe(fe.INTERNAL_ERROR,"Internal error: "+n)}/**
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
 */class Xe{constructor(e,t){this.bucket=e,this.path_=t}get path(){return this.path_}get isRoot(){return this.path.length===0}fullServerUrl(){const e=encodeURIComponent;return"/b/"+e(this.bucket)+"/o/"+e(this.path)}bucketOnlyServerUrl(){return"/b/"+encodeURIComponent(this.bucket)+"/o"}static makeFromBucketSpec(e,t){let r;try{r=Xe.makeFromUrl(e,t)}catch{return new Xe(e,"")}if(r.path==="")return r;throw nP(e)}static makeFromUrl(e,t){let r=null;const i="([A-Za-z0-9.\\-_]+)";function s(G){G.path.charAt(G.path.length-1)==="/"&&(G.path_=G.path_.slice(0,-1))}const o="(/(.*))?$",c=new RegExp("^gs://"+i+o,"i"),u={bucket:1,path:3};function l(G){G.path_=decodeURIComponent(G.path)}const f="v[A-Za-z0-9_]+",p=t.replace(/[.]/g,"\\."),g="(/([^?#]*).*)?$",A=new RegExp(`^https?://${p}/${f}/b/${i}/o${g}`,"i"),C={bucket:1,path:3},V=t===py?"(?:storage.googleapis.com|storage.cloud.google.com)":t,D="([^?#]*)",j=new RegExp(`^https?://${V}/${i}/${D}`,"i"),U=[{regex:c,indices:u,postModify:s},{regex:A,indices:C,postModify:l},{regex:j,indices:{bucket:1,path:2},postModify:l}];for(let G=0;G<U.length;G++){const Z=U[G],Q=Z.regex.exec(e);if(Q){const T=Q[Z.indices.bucket];let _=Q[Z.indices.path];_||(_=""),r=new Xe(T,_),Z.postModify(r);break}}if(r==null)throw tP(e);return r}}class cP{constructor(e){this.promise_=Promise.reject(e)}getPromise(){return this.promise_}cancel(e=!1){}}/**
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
 */function uP(n,e,t){let r=1,i=null,s=null,o=!1,c=0;function u(){return c===2}let l=!1;function f(...D){l||(l=!0,e.apply(null,D))}function p(D){i=setTimeout(()=>{i=null,n(A,u())},D)}function g(){s&&clearTimeout(s)}function A(D,...j){if(l){g();return}if(D){g(),f.call(null,D,...j);return}if(u()||o){g(),f.call(null,D,...j);return}r<64&&(r*=2);let U;c===1?(c=2,U=0):U=(r+Math.random())*1e3,p(U)}let C=!1;function V(D){C||(C=!0,g(),!l&&(i!==null?(D||(c=2),clearTimeout(i),p(0)):D||(c=1)))}return p(0),s=setTimeout(()=>{o=!0,V(!0)},t),V}function lP(n){n(!1)}/**
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
 */function hP(n){return n!==void 0}function dP(n){return typeof n=="object"&&!Array.isArray(n)}function Ql(n){return typeof n=="string"||n instanceof String}function yp(n){return Jl()&&n instanceof Blob}function Jl(){return typeof Blob<"u"}function Ip(n,e,t,r){if(r<e)throw wu(`Invalid value for '${n}'. Expected ${e} or greater.`);if(r>t)throw wu(`Invalid value for '${n}'. Expected ${t} or less.`)}/**
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
 */function Ma(n,e,t){let r=e;return t==null&&(r=`https://${e}`),`${t}://${r}/v0${n}`}function _y(n){const e=encodeURIComponent;let t="?";for(const r in n)if(n.hasOwnProperty(r)){const i=e(r)+"="+e(n[r]);t=t+i+"&"}return t=t.slice(0,-1),t}var zn;(function(n){n[n.NO_ERROR=0]="NO_ERROR",n[n.NETWORK_ERROR=1]="NETWORK_ERROR",n[n.ABORT=2]="ABORT"})(zn||(zn={}));/**
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
 */function fP(n,e){const t=n>=500&&n<600,i=[408,429].indexOf(n)!==-1,s=e.indexOf(n)!==-1;return t||i||s}/**
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
 */class pP{constructor(e,t,r,i,s,o,c,u,l,f,p,g=!0,A=!1){this.url_=e,this.method_=t,this.headers_=r,this.body_=i,this.successCodes_=s,this.additionalRetryCodes_=o,this.callback_=c,this.errorCallback_=u,this.timeout_=l,this.progressCallback_=f,this.connectionFactory_=p,this.retry=g,this.isUsingEmulator=A,this.pendingConnection_=null,this.backoffId_=null,this.canceled_=!1,this.appDelete_=!1,this.promise_=new Promise((C,V)=>{this.resolve_=C,this.reject_=V,this.start_()})}start_(){const e=(r,i)=>{if(i){r(!1,new co(!1,null,!0));return}const s=this.connectionFactory_();this.pendingConnection_=s;const o=c=>{const u=c.loaded,l=c.lengthComputable?c.total:-1;this.progressCallback_!==null&&this.progressCallback_(u,l)};this.progressCallback_!==null&&s.addUploadProgressListener(o),s.send(this.url_,this.method_,this.isUsingEmulator,this.body_,this.headers_).then(()=>{this.progressCallback_!==null&&s.removeUploadProgressListener(o),this.pendingConnection_=null;const c=s.getErrorCode()===zn.NO_ERROR,u=s.getStatus();if(!c||fP(u,this.additionalRetryCodes_)&&this.retry){const f=s.getErrorCode()===zn.ABORT;r(!1,new co(!1,null,f));return}const l=this.successCodes_.indexOf(u)!==-1;r(!0,new co(l,s))})},t=(r,i)=>{const s=this.resolve_,o=this.reject_,c=i.connection;if(i.wasSuccessCode)try{const u=this.callback_(c,c.getResponse());hP(u)?s(u):s()}catch(u){o(u)}else if(c!==null){const u=Wl();u.serverResponse=c.getErrorText(),this.errorCallback_?o(this.errorCallback_(c,u)):o(u)}else if(i.canceled){const u=this.appDelete_?gy():eP();o(u)}else{const u=ZS();o(u)}};this.canceled_?t(!1,new co(!1,null,!0)):this.backoffId_=uP(e,t,this.timeout_)}getPromise(){return this.promise_}cancel(e){this.canceled_=!0,this.appDelete_=e||!1,this.backoffId_!==null&&lP(this.backoffId_),this.pendingConnection_!==null&&this.pendingConnection_.abort()}}class co{constructor(e,t,r){this.wasSuccessCode=e,this.connection=t,this.canceled=!!r}}function mP(n,e){e!==null&&e.length>0&&(n.Authorization="Firebase "+e)}function gP(n,e){n["X-Firebase-Storage-Version"]="webjs/"+(e??"AppManager")}function _P(n,e){e&&(n["X-Firebase-GMPID"]=e)}function yP(n,e){e!==null&&(n["X-Firebase-AppCheck"]=e)}function IP(n,e,t,r,i,s,o=!0,c=!1){const u=_y(n.urlParams),l=n.url+u,f=Object.assign({},n.headers);return _P(f,e),mP(f,t),gP(f,s),yP(f,r),new pP(l,n.method,f,n.body,n.successCodes,n.additionalRetryCodes,n.handler,n.errorHandler,n.timeout,n.progressCallback,i,o,c)}/**
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
 */function TP(){return typeof BlobBuilder<"u"?BlobBuilder:typeof WebKitBlobBuilder<"u"?WebKitBlobBuilder:void 0}function EP(...n){const e=TP();if(e!==void 0){const t=new e;for(let r=0;r<n.length;r++)t.append(n[r]);return t.getBlob()}else{if(Jl())return new Blob(n);throw new pe(fe.UNSUPPORTED_ENVIRONMENT,"This browser doesn't seem to support creating Blobs")}}function wP(n,e,t){return n.webkitSlice?n.webkitSlice(e,t):n.mozSlice?n.mozSlice(e,t):n.slice?n.slice(e,t):null}/**
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
 */function vP(n){if(typeof atob>"u")throw oP("base-64");return atob(n)}/**
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
 */const Tt={RAW:"raw",BASE64:"base64",BASE64URL:"base64url",DATA_URL:"data_url"};class Cc{constructor(e,t){this.data=e,this.contentType=t||null}}function AP(n,e){switch(n){case Tt.RAW:return new Cc(yy(e));case Tt.BASE64:case Tt.BASE64URL:return new Cc(Iy(n,e));case Tt.DATA_URL:return new Cc(RP(e),SP(e))}throw Wl()}function yy(n){const e=[];for(let t=0;t<n.length;t++){let r=n.charCodeAt(t);if(r<=127)e.push(r);else if(r<=2047)e.push(192|r>>6,128|r&63);else if((r&64512)===55296)if(!(t<n.length-1&&(n.charCodeAt(t+1)&64512)===56320))e.push(239,191,189);else{const s=r,o=n.charCodeAt(++t);r=65536|(s&1023)<<10|o&1023,e.push(240|r>>18,128|r>>12&63,128|r>>6&63,128|r&63)}else(r&64512)===56320?e.push(239,191,189):e.push(224|r>>12,128|r>>6&63,128|r&63)}return new Uint8Array(e)}function bP(n){let e;try{e=decodeURIComponent(n)}catch{throw Qi(Tt.DATA_URL,"Malformed data URL.")}return yy(e)}function Iy(n,e){switch(n){case Tt.BASE64:{const i=e.indexOf("-")!==-1,s=e.indexOf("_")!==-1;if(i||s)throw Qi(n,"Invalid character '"+(i?"-":"_")+"' found: is it base64url encoded?");break}case Tt.BASE64URL:{const i=e.indexOf("+")!==-1,s=e.indexOf("/")!==-1;if(i||s)throw Qi(n,"Invalid character '"+(i?"+":"/")+"' found: is it base64 encoded?");e=e.replace(/-/g,"+").replace(/_/g,"/");break}}let t;try{t=vP(e)}catch(i){throw i.message.includes("polyfill")?i:Qi(n,"Invalid character found")}const r=new Uint8Array(t.length);for(let i=0;i<t.length;i++)r[i]=t.charCodeAt(i);return r}class Ty{constructor(e){this.base64=!1,this.contentType=null;const t=e.match(/^data:([^,]+)?,/);if(t===null)throw Qi(Tt.DATA_URL,"Must be formatted 'data:[<mediatype>][;base64],<data>");const r=t[1]||null;r!=null&&(this.base64=PP(r,";base64"),this.contentType=this.base64?r.substring(0,r.length-7):r),this.rest=e.substring(e.indexOf(",")+1)}}function RP(n){const e=new Ty(n);return e.base64?Iy(Tt.BASE64,e.rest):bP(e.rest)}function SP(n){return new Ty(n).contentType}function PP(n,e){return n.length>=e.length?n.substring(n.length-e.length)===e:!1}/**
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
 */class en{constructor(e,t){let r=0,i="";yp(e)?(this.data_=e,r=e.size,i=e.type):e instanceof ArrayBuffer?(t?this.data_=new Uint8Array(e):(this.data_=new Uint8Array(e.byteLength),this.data_.set(new Uint8Array(e))),r=this.data_.length):e instanceof Uint8Array&&(t?this.data_=e:(this.data_=new Uint8Array(e.length),this.data_.set(e)),r=e.length),this.size_=r,this.type_=i}size(){return this.size_}type(){return this.type_}slice(e,t){if(yp(this.data_)){const r=this.data_,i=wP(r,e,t);return i===null?null:new en(i)}else{const r=new Uint8Array(this.data_.buffer,e,t-e);return new en(r,!0)}}static getBlob(...e){if(Jl()){const t=e.map(r=>r instanceof en?r.data_:r);return new en(EP.apply(null,t))}else{const t=e.map(o=>Ql(o)?AP(Tt.RAW,o).data:o.data_);let r=0;t.forEach(o=>{r+=o.byteLength});const i=new Uint8Array(r);let s=0;return t.forEach(o=>{for(let c=0;c<o.length;c++)i[s++]=o[c]}),new en(i,!0)}}uploadData(){return this.data_}}/**
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
 */function Ey(n){let e;try{e=JSON.parse(n)}catch{return null}return dP(e)?e:null}/**
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
 */function CP(n){if(n.length===0)return null;const e=n.lastIndexOf("/");return e===-1?"":n.slice(0,e)}function kP(n,e){const t=e.split("/").filter(r=>r.length>0).join("/");return n.length===0?t:n+"/"+t}function wy(n){const e=n.lastIndexOf("/",n.length-2);return e===-1?n:n.slice(e+1)}/**
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
 */function DP(n,e){return e}class Fe{constructor(e,t,r,i){this.server=e,this.local=t||e,this.writable=!!r,this.xform=i||DP}}let uo=null;function NP(n){return!Ql(n)||n.length<2?n:wy(n)}function vy(){if(uo)return uo;const n=[];n.push(new Fe("bucket")),n.push(new Fe("generation")),n.push(new Fe("metageneration")),n.push(new Fe("name","fullPath",!0));function e(s,o){return NP(o)}const t=new Fe("name");t.xform=e,n.push(t);function r(s,o){return o!==void 0?Number(o):o}const i=new Fe("size");return i.xform=r,n.push(i),n.push(new Fe("timeCreated")),n.push(new Fe("updated")),n.push(new Fe("md5Hash",null,!0)),n.push(new Fe("cacheControl",null,!0)),n.push(new Fe("contentDisposition",null,!0)),n.push(new Fe("contentEncoding",null,!0)),n.push(new Fe("contentLanguage",null,!0)),n.push(new Fe("contentType",null,!0)),n.push(new Fe("metadata","customMetadata",!0)),uo=n,uo}function VP(n,e){function t(){const r=n.bucket,i=n.fullPath,s=new Xe(r,i);return e._makeStorageReference(s)}Object.defineProperty(n,"ref",{get:t})}function OP(n,e,t){const r={};r.type="file";const i=t.length;for(let s=0;s<i;s++){const o=t[s];r[o.local]=o.xform(r,e[o.server])}return VP(r,n),r}function Ay(n,e,t){const r=Ey(e);return r===null?null:OP(n,r,t)}function xP(n,e,t,r){const i=Ey(e);if(i===null||!Ql(i.downloadTokens))return null;const s=i.downloadTokens;if(s.length===0)return null;const o=encodeURIComponent;return s.split(",").map(l=>{const f=n.bucket,p=n.fullPath,g="/b/"+o(f)+"/o/"+o(p),A=Ma(g,t,r),C=_y({alt:"media",token:l});return A+C})[0]}function MP(n,e){const t={},r=e.length;for(let i=0;i<r;i++){const s=e[i];s.writable&&(t[s.server]=n[s.local])}return JSON.stringify(t)}class Yl{constructor(e,t,r,i){this.url=e,this.method=t,this.handler=r,this.timeout=i,this.urlParams={},this.headers={},this.body=null,this.errorHandler=null,this.progressCallback=null,this.successCodes=[200],this.additionalRetryCodes=[]}}/**
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
 */function by(n){if(!n)throw Wl()}function LP(n,e){function t(r,i){const s=Ay(n,i,e);return by(s!==null),s}return t}function FP(n,e){function t(r,i){const s=Ay(n,i,e);return by(s!==null),xP(s,i,n.host,n._protocol)}return t}function Ry(n){function e(t,r){let i;return t.getStatus()===401?t.getErrorText().includes("Firebase App Check token is invalid")?i=YS():i=JS():t.getStatus()===402?i=QS(n.bucket):t.getStatus()===403?i=XS(n.path):i=r,i.status=t.getStatus(),i.serverResponse=r.serverResponse,i}return e}function Sy(n){const e=Ry(n);function t(r,i){let s=e(r,i);return r.getStatus()===404&&(s=WS(n.path)),s.serverResponse=i.serverResponse,s}return t}function UP(n,e,t){const r=e.fullServerUrl(),i=Ma(r,n.host,n._protocol),s="GET",o=n.maxOperationRetryTime,c=new Yl(i,s,FP(n,t),o);return c.errorHandler=Sy(e),c}function BP(n,e){const t=e.fullServerUrl(),r=Ma(t,n.host,n._protocol),i="DELETE",s=n.maxOperationRetryTime;function o(u,l){}const c=new Yl(r,i,o,s);return c.successCodes=[200,204],c.errorHandler=Sy(e),c}function $P(n,e){return n&&n.contentType||e&&e.type()||"application/octet-stream"}function qP(n,e,t){const r=Object.assign({},t);return r.fullPath=n.path,r.size=e.size(),r.contentType||(r.contentType=$P(null,e)),r}function jP(n,e,t,r,i){const s=e.bucketOnlyServerUrl(),o={"X-Goog-Upload-Protocol":"multipart"};function c(){let U="";for(let G=0;G<2;G++)U=U+Math.random().toString().slice(2);return U}const u=c();o["Content-Type"]="multipart/related; boundary="+u;const l=qP(e,r,i),f=MP(l,t),p="--"+u+`\r
Content-Type: application/json; charset=utf-8\r
\r
`+f+`\r
--`+u+`\r
Content-Type: `+l.contentType+`\r
\r
`,g=`\r
--`+u+"--",A=en.getBlob(p,r,g);if(A===null)throw iP();const C={name:l.fullPath},V=Ma(s,n.host,n._protocol),D="POST",j=n.maxUploadRetryTime,q=new Yl(V,D,LP(n,t),j);return q.urlParams=C,q.headers=o,q.body=A.uploadData(),q.errorHandler=Ry(e),q}class zP{constructor(){this.sent_=!1,this.xhr_=new XMLHttpRequest,this.initXhr(),this.errorCode_=zn.NO_ERROR,this.sendPromise_=new Promise(e=>{this.xhr_.addEventListener("abort",()=>{this.errorCode_=zn.ABORT,e()}),this.xhr_.addEventListener("error",()=>{this.errorCode_=zn.NETWORK_ERROR,e()}),this.xhr_.addEventListener("load",()=>{e()})})}send(e,t,r,i,s){if(this.sent_)throw Di("cannot .send() more than once");if(bt(e)&&r&&(this.xhr_.withCredentials=!0),this.sent_=!0,this.xhr_.open(t,e,!0),s!==void 0)for(const o in s)s.hasOwnProperty(o)&&this.xhr_.setRequestHeader(o,s[o].toString());return i!==void 0?this.xhr_.send(i):this.xhr_.send(),this.sendPromise_}getErrorCode(){if(!this.sent_)throw Di("cannot .getErrorCode() before sending");return this.errorCode_}getStatus(){if(!this.sent_)throw Di("cannot .getStatus() before sending");try{return this.xhr_.status}catch{return-1}}getResponse(){if(!this.sent_)throw Di("cannot .getResponse() before sending");return this.xhr_.response}getErrorText(){if(!this.sent_)throw Di("cannot .getErrorText() before sending");return this.xhr_.statusText}abort(){this.xhr_.abort()}getResponseHeader(e){return this.xhr_.getResponseHeader(e)}addUploadProgressListener(e){this.xhr_.upload!=null&&this.xhr_.upload.addEventListener("progress",e)}removeUploadProgressListener(e){this.xhr_.upload!=null&&this.xhr_.upload.removeEventListener("progress",e)}}class GP extends zP{initXhr(){this.xhr_.responseType="text"}}function Xl(){return new GP}/**
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
 */class nr{constructor(e,t){this._service=e,t instanceof Xe?this._location=t:this._location=Xe.makeFromUrl(t,e.host)}toString(){return"gs://"+this._location.bucket+"/"+this._location.path}_newRef(e,t){return new nr(e,t)}get root(){const e=new Xe(this._location.bucket,"");return this._newRef(this._service,e)}get bucket(){return this._location.bucket}get fullPath(){return this._location.path}get name(){return wy(this._location.path)}get storage(){return this._service}get parent(){const e=CP(this._location.path);if(e===null)return null;const t=new Xe(this._location.bucket,e);return new nr(this._service,t)}_throwIfRoot(e){if(this._location.path==="")throw aP(e)}}function KP(n,e,t){n._throwIfRoot("uploadBytes");const r=jP(n.storage,n._location,vy(),new en(e,!0),t);return n.storage.makeRequestWithTokens(r,Xl).then(i=>({metadata:i,ref:n}))}function HP(n){n._throwIfRoot("getDownloadURL");const e=UP(n.storage,n._location,vy());return n.storage.makeRequestWithTokens(e,Xl).then(t=>{if(t===null)throw sP();return t})}function WP(n){n._throwIfRoot("deleteObject");const e=BP(n.storage,n._location);return n.storage.makeRequestWithTokens(e,Xl)}function QP(n,e){const t=kP(n._location.path,e),r=new Xe(n._location.bucket,t);return new nr(n.storage,r)}/**
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
 */function JP(n){return/^[A-Za-z]+:\/\//.test(n)}function YP(n,e){return new nr(n,e)}function Py(n,e){if(n instanceof Zl){const t=n;if(t._bucket==null)throw rP();const r=new nr(t,t._bucket);return e!=null?Py(r,e):r}else return e!==void 0?QP(n,e):n}function XP(n,e){if(e&&JP(e)){if(n instanceof Zl)return YP(n,e);throw wu("To use ref(service, url), the first argument must be a Storage instance.")}else return Py(n,e)}function Tp(n,e){const t=e?.[my];return t==null?null:Xe.makeFromBucketSpec(t,n)}function ZP(n,e,t,r={}){n.host=`${e}:${t}`;const i=bt(e);i&&(ua(`https://${n.host}/b`),Nu("Storage",!0)),n._isUsingEmulator=!0,n._protocol=i?"https":"http";const{mockUserToken:s}=r;s&&(n._overrideAuthToken=typeof s=="string"?s:mT(s,n.app.options.projectId))}class Zl{constructor(e,t,r,i,s,o=!1){this.app=e,this._authProvider=t,this._appCheckProvider=r,this._url=i,this._firebaseVersion=s,this._isUsingEmulator=o,this._bucket=null,this._host=py,this._protocol="https",this._appId=null,this._deleted=!1,this._maxOperationRetryTime=KS,this._maxUploadRetryTime=HS,this._requests=new Set,i!=null?this._bucket=Xe.makeFromBucketSpec(i,this._host):this._bucket=Tp(this._host,this.app.options)}get host(){return this._host}set host(e){this._host=e,this._url!=null?this._bucket=Xe.makeFromBucketSpec(this._url,e):this._bucket=Tp(e,this.app.options)}get maxUploadRetryTime(){return this._maxUploadRetryTime}set maxUploadRetryTime(e){Ip("time",0,Number.POSITIVE_INFINITY,e),this._maxUploadRetryTime=e}get maxOperationRetryTime(){return this._maxOperationRetryTime}set maxOperationRetryTime(e){Ip("time",0,Number.POSITIVE_INFINITY,e),this._maxOperationRetryTime=e}async _getAuthToken(){if(this._overrideAuthToken)return this._overrideAuthToken;const e=this._authProvider.getImmediate({optional:!0});if(e){const t=await e.getToken();if(t!==null)return t.accessToken}return null}async _getAppCheckToken(){if(qe(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=this._appCheckProvider.getImmediate({optional:!0});return e?(await e.getToken()).token:null}_delete(){return this._deleted||(this._deleted=!0,this._requests.forEach(e=>e.cancel()),this._requests.clear()),Promise.resolve()}_makeStorageReference(e){return new nr(this,e)}_makeRequest(e,t,r,i,s=!0){if(this._deleted)return new cP(gy());{const o=IP(e,this._appId,r,i,t,this._firebaseVersion,s,this._isUsingEmulator);return this._requests.add(o),o.getPromise().then(()=>this._requests.delete(o),()=>this._requests.delete(o)),o}}async makeRequestWithTokens(e,t){const[r,i]=await Promise.all([this._getAuthToken(),this._getAppCheckToken()]);return this._makeRequest(e,t,r,i).getPromise()}}const Ep="@firebase/storage",wp="0.14.0";/**
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
 */const Cy="storage";function UD(n,e,t){return n=K(n),KP(n,e,t)}function BD(n){return n=K(n),HP(n)}function $D(n){return n=K(n),WP(n)}function qD(n,e){return n=K(n),XP(n,e)}function jD(n=Ts(),e){n=K(n);const r=Rt(n,Cy).getImmediate({identifier:e}),i=nm("storage");return i&&eC(r,...i),r}function eC(n,e,t,r={}){ZP(n,e,t,r)}function tC(n,{instanceIdentifier:e}){const t=n.getProvider("app").getImmediate(),r=n.getProvider("auth-internal"),i=n.getProvider("app-check-internal");return new Zl(t,r,i,e,sr)}function nC(){tt(new Ke(Cy,tC,"PUBLIC").setMultipleInstances(!0)),be(Ep,wp,""),be(Ep,wp,"esm2020")}nC();/**
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
 */const rC="type.googleapis.com/google.protobuf.Int64Value",iC="type.googleapis.com/google.protobuf.UInt64Value";function ky(n,e){const t={};for(const r in n)n.hasOwnProperty(r)&&(t[r]=e(n[r]));return t}function ra(n){if(n==null)return null;if(n instanceof Number&&(n=n.valueOf()),typeof n=="number"&&isFinite(n)||n===!0||n===!1||Object.prototype.toString.call(n)==="[object String]")return n;if(n instanceof Date)return n.toISOString();if(Array.isArray(n))return n.map(e=>ra(e));if(typeof n=="function"||typeof n=="object")return ky(n,e=>ra(e));throw new Error("Data cannot be encoded in JSON: "+n)}function Yr(n){if(n==null)return n;if(n["@type"])switch(n["@type"]){case rC:case iC:{const e=Number(n.value);if(isNaN(e))throw new Error("Data cannot be decoded from JSON: "+n);return e}default:throw new Error("Data cannot be decoded from JSON: "+n)}return Array.isArray(n)?n.map(e=>Yr(e)):typeof n=="function"||typeof n=="object"?ky(n,e=>Yr(e)):n}/**
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
 */const eh="functions";/**
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
 */const vp={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class Ge extends rt{constructor(e,t,r){super(`${eh}/${e}`,t||""),this.details=r,Object.setPrototypeOf(this,Ge.prototype)}}function sC(n){if(n>=200&&n<300)return"ok";switch(n){case 0:return"internal";case 400:return"invalid-argument";case 401:return"unauthenticated";case 403:return"permission-denied";case 404:return"not-found";case 409:return"aborted";case 429:return"resource-exhausted";case 499:return"cancelled";case 500:return"internal";case 501:return"unimplemented";case 503:return"unavailable";case 504:return"deadline-exceeded"}return"unknown"}function ia(n,e){let t=sC(n),r=t,i;try{const s=e&&e.error;if(s){const o=s.status;if(typeof o=="string"){if(!vp[o])return new Ge("internal","internal");t=vp[o],r=o}const c=s.message;typeof c=="string"&&(r=c),i=s.details,i!==void 0&&(i=Yr(i))}}catch{}return t==="ok"?null:new Ge(t,r,i)}/**
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
 */class oC{constructor(e,t,r,i){this.app=e,this.auth=null,this.messaging=null,this.appCheck=null,this.serverAppAppCheckToken=null,qe(e)&&e.settings.appCheckToken&&(this.serverAppAppCheckToken=e.settings.appCheckToken),this.auth=t.getImmediate({optional:!0}),this.messaging=r.getImmediate({optional:!0}),this.auth||t.get().then(s=>this.auth=s,()=>{}),this.messaging||r.get().then(s=>this.messaging=s,()=>{}),this.appCheck||i?.get().then(s=>this.appCheck=s,()=>{})}async getAuthToken(){if(this.auth)try{return(await this.auth.getToken())?.accessToken}catch{return}}async getMessagingToken(){if(!(!this.messaging||!("Notification"in self)||Notification.permission!=="granted"))try{return await this.messaging.getToken()}catch{return}}async getAppCheckToken(e){if(this.serverAppAppCheckToken)return this.serverAppAppCheckToken;if(this.appCheck){const t=e?await this.appCheck.getLimitedUseToken():await this.appCheck.getToken();return t.error?null:t.token}return null}async getContext(e){const t=await this.getAuthToken(),r=await this.getMessagingToken(),i=await this.getAppCheckToken(e);return{authToken:t,messagingToken:r,appCheckToken:i}}}/**
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
 */const vu="us-central1",aC=/^data: (.*?)(?:\n|$)/;function cC(n){let e=null;return{promise:new Promise((t,r)=>{e=setTimeout(()=>{r(new Ge("deadline-exceeded","deadline-exceeded"))},n)}),cancel:()=>{e&&clearTimeout(e)}}}class uC{constructor(e,t,r,i,s=vu,o=(...c)=>fetch(...c)){this.app=e,this.fetchImpl=o,this.emulatorOrigin=null,this.contextProvider=new oC(e,t,r,i),this.cancelAllRequests=new Promise(c=>{this.deleteService=()=>Promise.resolve(c())});try{const c=new URL(s);this.customDomain=c.origin+(c.pathname==="/"?"":c.pathname),this.region=vu}catch{this.customDomain=null,this.region=s}}_delete(){return this.deleteService()}_url(e){const t=this.app.options.projectId;return this.emulatorOrigin!==null?`${this.emulatorOrigin}/${t}/${this.region}/${e}`:this.customDomain!==null?`${this.customDomain}/${e}`:`https://${this.region}-${t}.cloudfunctions.net/${e}`}}function lC(n,e,t){const r=bt(e);n.emulatorOrigin=`http${r?"s":""}://${e}:${t}`,r&&(ua(n.emulatorOrigin+"/backends"),Nu("Functions",!0))}function hC(n,e,t){const r=i=>fC(n,e,i,{});return r.stream=(i,s)=>mC(n,e,i,s),r}function Dy(n){return n.emulatorOrigin&&bt(n.emulatorOrigin)?"include":void 0}async function dC(n,e,t,r,i){t["Content-Type"]="application/json";let s;try{s=await r(n,{method:"POST",body:JSON.stringify(e),headers:t,credentials:Dy(i)})}catch{return{status:0,json:null}}let o=null;try{o=await s.json()}catch{}return{status:s.status,json:o}}async function Ny(n,e){const t={},r=await n.contextProvider.getContext(e.limitedUseAppCheckTokens);return r.authToken&&(t.Authorization="Bearer "+r.authToken),r.messagingToken&&(t["Firebase-Instance-ID-Token"]=r.messagingToken),r.appCheckToken!==null&&(t["X-Firebase-AppCheck"]=r.appCheckToken),t}function fC(n,e,t,r){const i=n._url(e);return pC(n,i,t,r)}async function pC(n,e,t,r){t=ra(t);const i={data:t},s=await Ny(n,r),o=r.timeout||7e4,c=cC(o),u=await Promise.race([dC(e,i,s,n.fetchImpl,n),c.promise,n.cancelAllRequests]);if(c.cancel(),!u)throw new Ge("cancelled","Firebase Functions instance was deleted.");const l=ia(u.status,u.json);if(l)throw l;if(!u.json)throw new Ge("internal","Response is not valid JSON object.");let f=u.json.data;if(typeof f>"u"&&(f=u.json.result),typeof f>"u")throw new Ge("internal","Response is missing data field.");return{data:Yr(f)}}function mC(n,e,t,r){const i=n._url(e);return gC(n,i,t,r||{})}async function gC(n,e,t,r){t=ra(t);const i={data:t},s=await Ny(n,r);s["Content-Type"]="application/json",s.Accept="text/event-stream";let o;try{o=await n.fetchImpl(e,{method:"POST",body:JSON.stringify(i),headers:s,signal:r?.signal,credentials:Dy(n)})}catch(g){if(g instanceof Error&&g.name==="AbortError"){const C=new Ge("cancelled","Request was cancelled.");return{data:Promise.reject(C),stream:{[Symbol.asyncIterator](){return{next(){return Promise.reject(C)}}}}}}const A=ia(0,null);return{data:Promise.reject(A),stream:{[Symbol.asyncIterator](){return{next(){return Promise.reject(A)}}}}}}let c,u;const l=new Promise((g,A)=>{c=g,u=A});r?.signal?.addEventListener("abort",()=>{const g=new Ge("cancelled","Request was cancelled.");u(g)});const f=o.body.getReader(),p=_C(f,c,u,r?.signal);return{stream:{[Symbol.asyncIterator](){const g=p.getReader();return{async next(){const{value:A,done:C}=await g.read();return{value:A,done:C}},async return(){return await g.cancel(),{done:!0,value:void 0}}}}},data:l}}function _C(n,e,t,r){const i=(o,c)=>{const u=o.match(aC);if(!u)return;const l=u[1];try{const f=JSON.parse(l);if("result"in f){e(Yr(f.result));return}if("message"in f){c.enqueue(Yr(f.message));return}if("error"in f){const p=ia(0,f);c.error(p),t(p);return}}catch(f){if(f instanceof Ge){c.error(f),t(f);return}}},s=new TextDecoder;return new ReadableStream({start(o){let c="";return u();async function u(){if(r?.aborted){const l=new Ge("cancelled","Request was cancelled");return o.error(l),t(l),Promise.resolve()}try{const{value:l,done:f}=await n.read();if(f){c.trim()&&i(c.trim(),o),o.close();return}if(r?.aborted){const g=new Ge("cancelled","Request was cancelled");o.error(g),t(g),await n.cancel();return}c+=s.decode(l,{stream:!0});const p=c.split(`
`);c=p.pop()||"";for(const g of p)g.trim()&&i(g.trim(),o);return u()}catch(l){const f=l instanceof Ge?l:ia(0,null);o.error(f),t(f)}}},cancel(){return n.cancel()}})}const Ap="@firebase/functions",bp="0.13.1";/**
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
 */const yC="auth-internal",IC="app-check-internal",TC="messaging-internal";function EC(n){const e=(t,{instanceIdentifier:r})=>{const i=t.getProvider("app").getImmediate(),s=t.getProvider(yC),o=t.getProvider(TC),c=t.getProvider(IC);return new uC(i,s,o,c,r)};tt(new Ke(eh,e,"PUBLIC").setMultipleInstances(!0)),be(Ap,bp,n),be(Ap,bp,"esm2020")}/**
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
 */function zD(n=Ts(),e=vu){const r=Rt(K(n),eh).getImmediate({identifier:e}),i=nm("functions");return i&&wC(r,...i),r}function wC(n,e,t){lC(K(n),e,t)}function GD(n,e,t){return hC(K(n),e)}EC();const Vy="@firebase/installations",th="0.6.19";/**
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
 */const Oy=1e4,xy=`w:${th}`,My="FIS_v2",vC="https://firebaseinstallations.googleapis.com/v1",AC=3600*1e3,bC="installations",RC="Installations";/**
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
 */const SC={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"not-registered":"Firebase Installation is not registered.","installation-not-found":"Firebase Installation not found.","request-failed":'{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',"app-offline":"Could not process request. Application offline.","delete-pending-registration":"Can't delete installation while there is a pending registration request."},rr=new yn(bC,RC,SC);function Ly(n){return n instanceof rt&&n.code.includes("request-failed")}/**
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
 */function Fy({projectId:n}){return`${vC}/projects/${n}/installations`}function Uy(n){return{token:n.token,requestStatus:2,expiresIn:CC(n.expiresIn),creationTime:Date.now()}}async function By(n,e){const r=(await e.json()).error;return rr.create("request-failed",{requestName:n,serverCode:r.code,serverMessage:r.message,serverStatus:r.status})}function $y({apiKey:n}){return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":n})}function PC(n,{refreshToken:e}){const t=$y(n);return t.append("Authorization",kC(e)),t}async function qy(n){const e=await n();return e.status>=500&&e.status<600?n():e}function CC(n){return Number(n.replace("s","000"))}function kC(n){return`${My} ${n}`}/**
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
 */async function DC({appConfig:n,heartbeatServiceProvider:e},{fid:t}){const r=Fy(n),i=$y(n),s=e.getImmediate({optional:!0});if(s){const l=await s.getHeartbeatsHeader();l&&i.append("x-firebase-client",l)}const o={fid:t,authVersion:My,appId:n.appId,sdkVersion:xy},c={method:"POST",headers:i,body:JSON.stringify(o)},u=await qy(()=>fetch(r,c));if(u.ok){const l=await u.json();return{fid:l.fid||t,registrationStatus:2,refreshToken:l.refreshToken,authToken:Uy(l.authToken)}}else throw await By("Create Installation",u)}/**
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
 */function jy(n){return new Promise(e=>{setTimeout(e,n)})}/**
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
 */function NC(n){return btoa(String.fromCharCode(...n)).replace(/\+/g,"-").replace(/\//g,"_")}/**
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
 */const VC=/^[cdef][\w-]{21}$/,Au="";function OC(){try{const n=new Uint8Array(17);(self.crypto||self.msCrypto).getRandomValues(n),n[0]=112+n[0]%16;const t=xC(n);return VC.test(t)?t:Au}catch{return Au}}function xC(n){return NC(n).substr(0,22)}/**
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
 */function La(n){return`${n.appName}!${n.appId}`}/**
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
 */const zy=new Map;function Gy(n,e){const t=La(n);Ky(t,e),MC(t,e)}function Ky(n,e){const t=zy.get(n);if(t)for(const r of t)r(e)}function MC(n,e){const t=LC();t&&t.postMessage({key:n,fid:e}),FC()}let Bn=null;function LC(){return!Bn&&"BroadcastChannel"in self&&(Bn=new BroadcastChannel("[Firebase] FID Change"),Bn.onmessage=n=>{Ky(n.data.key,n.data.fid)}),Bn}function FC(){zy.size===0&&Bn&&(Bn.close(),Bn=null)}/**
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
 */const UC="firebase-installations-database",BC=1,ir="firebase-installations-store";let kc=null;function nh(){return kc||(kc=lm(UC,BC,{upgrade:(n,e)=>{switch(e){case 0:n.createObjectStore(ir)}}})),kc}async function sa(n,e){const t=La(n),i=(await nh()).transaction(ir,"readwrite"),s=i.objectStore(ir),o=await s.get(t);return await s.put(e,t),await i.done,(!o||o.fid!==e.fid)&&Gy(n,e.fid),e}async function Hy(n){const e=La(n),r=(await nh()).transaction(ir,"readwrite");await r.objectStore(ir).delete(e),await r.done}async function Fa(n,e){const t=La(n),i=(await nh()).transaction(ir,"readwrite"),s=i.objectStore(ir),o=await s.get(t),c=e(o);return c===void 0?await s.delete(t):await s.put(c,t),await i.done,c&&(!o||o.fid!==c.fid)&&Gy(n,c.fid),c}/**
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
 */async function rh(n){let e;const t=await Fa(n.appConfig,r=>{const i=$C(r),s=qC(n,i);return e=s.registrationPromise,s.installationEntry});return t.fid===Au?{installationEntry:await e}:{installationEntry:t,registrationPromise:e}}function $C(n){const e=n||{fid:OC(),registrationStatus:0};return Wy(e)}function qC(n,e){if(e.registrationStatus===0){if(!navigator.onLine){const i=Promise.reject(rr.create("app-offline"));return{installationEntry:e,registrationPromise:i}}const t={fid:e.fid,registrationStatus:1,registrationTime:Date.now()},r=jC(n,t);return{installationEntry:t,registrationPromise:r}}else return e.registrationStatus===1?{installationEntry:e,registrationPromise:zC(n)}:{installationEntry:e}}async function jC(n,e){try{const t=await DC(n,e);return sa(n.appConfig,t)}catch(t){throw Ly(t)&&t.customData.serverCode===409?await Hy(n.appConfig):await sa(n.appConfig,{fid:e.fid,registrationStatus:0}),t}}async function zC(n){let e=await Rp(n.appConfig);for(;e.registrationStatus===1;)await jy(100),e=await Rp(n.appConfig);if(e.registrationStatus===0){const{installationEntry:t,registrationPromise:r}=await rh(n);return r||t}return e}function Rp(n){return Fa(n,e=>{if(!e)throw rr.create("installation-not-found");return Wy(e)})}function Wy(n){return GC(n)?{fid:n.fid,registrationStatus:0}:n}function GC(n){return n.registrationStatus===1&&n.registrationTime+Oy<Date.now()}/**
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
 */async function KC({appConfig:n,heartbeatServiceProvider:e},t){const r=HC(n,t),i=PC(n,t),s=e.getImmediate({optional:!0});if(s){const l=await s.getHeartbeatsHeader();l&&i.append("x-firebase-client",l)}const o={installation:{sdkVersion:xy,appId:n.appId}},c={method:"POST",headers:i,body:JSON.stringify(o)},u=await qy(()=>fetch(r,c));if(u.ok){const l=await u.json();return Uy(l)}else throw await By("Generate Auth Token",u)}function HC(n,{fid:e}){return`${Fy(n)}/${e}/authTokens:generate`}/**
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
 */async function ih(n,e=!1){let t;const r=await Fa(n.appConfig,s=>{if(!Qy(s))throw rr.create("not-registered");const o=s.authToken;if(!e&&JC(o))return s;if(o.requestStatus===1)return t=WC(n,e),s;{if(!navigator.onLine)throw rr.create("app-offline");const c=XC(s);return t=QC(n,c),c}});return t?await t:r.authToken}async function WC(n,e){let t=await Sp(n.appConfig);for(;t.authToken.requestStatus===1;)await jy(100),t=await Sp(n.appConfig);const r=t.authToken;return r.requestStatus===0?ih(n,e):r}function Sp(n){return Fa(n,e=>{if(!Qy(e))throw rr.create("not-registered");const t=e.authToken;return ZC(t)?{...e,authToken:{requestStatus:0}}:e})}async function QC(n,e){try{const t=await KC(n,e),r={...e,authToken:t};return await sa(n.appConfig,r),t}catch(t){if(Ly(t)&&(t.customData.serverCode===401||t.customData.serverCode===404))await Hy(n.appConfig);else{const r={...e,authToken:{requestStatus:0}};await sa(n.appConfig,r)}throw t}}function Qy(n){return n!==void 0&&n.registrationStatus===2}function JC(n){return n.requestStatus===2&&!YC(n)}function YC(n){const e=Date.now();return e<n.creationTime||n.creationTime+n.expiresIn<e+AC}function XC(n){const e={requestStatus:1,requestTime:Date.now()};return{...n,authToken:e}}function ZC(n){return n.requestStatus===1&&n.requestTime+Oy<Date.now()}/**
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
 */async function e0(n){const e=n,{installationEntry:t,registrationPromise:r}=await rh(e);return r?r.catch(console.error):ih(e).catch(console.error),t.fid}/**
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
 */async function t0(n,e=!1){const t=n;return await n0(t),(await ih(t,e)).token}async function n0(n){const{registrationPromise:e}=await rh(n);e&&await e}/**
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
 */function r0(n){if(!n||!n.options)throw Dc("App Configuration");if(!n.name)throw Dc("App Name");const e=["projectId","apiKey","appId"];for(const t of e)if(!n.options[t])throw Dc(t);return{appName:n.name,projectId:n.options.projectId,apiKey:n.options.apiKey,appId:n.options.appId}}function Dc(n){return rr.create("missing-app-config-values",{valueName:n})}/**
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
 */const Jy="installations",i0="installations-internal",s0=n=>{const e=n.getProvider("app").getImmediate(),t=r0(e),r=Rt(e,"heartbeat");return{app:e,appConfig:t,heartbeatServiceProvider:r,_delete:()=>Promise.resolve()}},o0=n=>{const e=n.getProvider("app").getImmediate(),t=Rt(e,Jy).getImmediate();return{getId:()=>e0(t),getToken:i=>t0(t,i)}};function a0(){tt(new Ke(Jy,s0,"PUBLIC")),tt(new Ke(i0,o0,"PRIVATE"))}a0();be(Vy,th);be(Vy,th,"esm2020");/**
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
 */const oa="analytics",c0="firebase_id",u0="origin",l0=60*1e3,h0="https://firebase.googleapis.com/v1alpha/projects/-/apps/{app-id}/webConfig",sh="https://www.googletagmanager.com/gtag/js";/**
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
 */const xe=new Is("@firebase/analytics");/**
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
 */const d0={"already-exists":"A Firebase Analytics instance with the appId {$id}  already exists. Only one Firebase Analytics instance can be created for each appId.","already-initialized":"initializeAnalytics() cannot be called again with different options than those it was initially called with. It can be called again with the same options to return the existing instance, or getAnalytics() can be used to get a reference to the already-initialized instance.","already-initialized-settings":"Firebase Analytics has already been initialized.settings() must be called before initializing any Analytics instanceor it will have no effect.","interop-component-reg-failed":"Firebase Analytics Interop Component failed to instantiate: {$reason}","invalid-analytics-context":"Firebase Analytics is not supported in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","indexeddb-unavailable":"IndexedDB unavailable or restricted in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","fetch-throttle":"The config fetch request timed out while in an exponential backoff state. Unix timestamp in milliseconds when fetch request throttling ends: {$throttleEndTimeMillis}.","config-fetch-failed":"Dynamic config fetch failed: [{$httpStatus}] {$responseMessage}","no-api-key":'The "apiKey" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid API key.',"no-app-id":'The "appId" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid app ID.',"no-client-id":'The "client_id" field is empty.',"invalid-gtag-resource":"Trusted Types detected an invalid gtag resource: {$gtagURL}."},et=new yn("analytics","Analytics",d0);/**
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
 */function f0(n){if(!n.startsWith(sh)){const e=et.create("invalid-gtag-resource",{gtagURL:n});return xe.warn(e.message),""}return n}function Yy(n){return Promise.all(n.map(e=>e.catch(t=>t)))}function p0(n,e){let t;return window.trustedTypes&&(t=window.trustedTypes.createPolicy(n,e)),t}function m0(n,e){const t=p0("firebase-js-sdk-policy",{createScriptURL:f0}),r=document.createElement("script"),i=`${sh}?l=${n}&id=${e}`;r.src=t?t?.createScriptURL(i):i,r.async=!0,document.head.appendChild(r)}function g0(n){let e=[];return Array.isArray(window[n])?e=window[n]:window[n]=e,e}async function _0(n,e,t,r,i,s){const o=r[i];try{if(o)await e[o];else{const u=(await Yy(t)).find(l=>l.measurementId===i);u&&await e[u.appId]}}catch(c){xe.error(c)}n("config",i,s)}async function y0(n,e,t,r,i){try{let s=[];if(i&&i.send_to){let o=i.send_to;Array.isArray(o)||(o=[o]);const c=await Yy(t);for(const u of o){const l=c.find(p=>p.measurementId===u),f=l&&e[l.appId];if(f)s.push(f);else{s=[];break}}}s.length===0&&(s=Object.values(e)),await Promise.all(s),n("event",r,i||{})}catch(s){xe.error(s)}}function I0(n,e,t,r){async function i(s,...o){try{if(s==="event"){const[c,u]=o;await y0(n,e,t,c,u)}else if(s==="config"){const[c,u]=o;await _0(n,e,t,r,c,u)}else if(s==="consent"){const[c,u]=o;n("consent",c,u)}else if(s==="get"){const[c,u,l]=o;n("get",c,u,l)}else if(s==="set"){const[c]=o;n("set",c)}else n(s,...o)}catch(c){xe.error(c)}}return i}function T0(n,e,t,r,i){let s=function(...o){window[r].push(arguments)};return window[i]&&typeof window[i]=="function"&&(s=window[i]),window[i]=I0(s,n,e,t),{gtagCore:s,wrappedGtag:window[i]}}function E0(n){const e=window.document.getElementsByTagName("script");for(const t of Object.values(e))if(t.src&&t.src.includes(sh)&&t.src.includes(n))return t;return null}/**
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
 */const w0=30,v0=1e3;class A0{constructor(e={},t=v0){this.throttleMetadata=e,this.intervalMillis=t}getThrottleMetadata(e){return this.throttleMetadata[e]}setThrottleMetadata(e,t){this.throttleMetadata[e]=t}deleteThrottleMetadata(e){delete this.throttleMetadata[e]}}const Xy=new A0;function b0(n){return new Headers({Accept:"application/json","x-goog-api-key":n})}async function R0(n){const{appId:e,apiKey:t}=n,r={method:"GET",headers:b0(t)},i=h0.replace("{app-id}",e),s=await fetch(i,r);if(s.status!==200&&s.status!==304){let o="";try{const c=await s.json();c.error?.message&&(o=c.error.message)}catch{}throw et.create("config-fetch-failed",{httpStatus:s.status,responseMessage:o})}return s.json()}async function S0(n,e=Xy,t){const{appId:r,apiKey:i,measurementId:s}=n.options;if(!r)throw et.create("no-app-id");if(!i){if(s)return{measurementId:s,appId:r};throw et.create("no-api-key")}const o=e.getThrottleMetadata(r)||{backoffCount:0,throttleEndTimeMillis:Date.now()},c=new k0;return setTimeout(async()=>{c.abort()},l0),Zy({appId:r,apiKey:i,measurementId:s},o,c,e)}async function Zy(n,{throttleEndTimeMillis:e,backoffCount:t},r,i=Xy){const{appId:s,measurementId:o}=n;try{await P0(r,e)}catch(c){if(o)return xe.warn(`Timed out fetching this Firebase app's measurement ID from the server. Falling back to the measurement ID ${o} provided in the "measurementId" field in the local Firebase config. [${c?.message}]`),{appId:s,measurementId:o};throw c}try{const c=await R0(n);return i.deleteThrottleMetadata(s),c}catch(c){const u=c;if(!C0(u)){if(i.deleteThrottleMetadata(s),o)return xe.warn(`Failed to fetch this Firebase app's measurement ID from the server. Falling back to the measurement ID ${o} provided in the "measurementId" field in the local Firebase config. [${u?.message}]`),{appId:s,measurementId:o};throw c}const l=Number(u?.customData?.httpStatus)===503?Td(t,i.intervalMillis,w0):Td(t,i.intervalMillis),f={throttleEndTimeMillis:Date.now()+l,backoffCount:t+1};return i.setThrottleMetadata(s,f),xe.debug(`Calling attemptFetch again in ${l} millis`),Zy(n,f,r,i)}}function P0(n,e){return new Promise((t,r)=>{const i=Math.max(e-Date.now(),0),s=setTimeout(t,i);n.addEventListener(()=>{clearTimeout(s),r(et.create("fetch-throttle",{throttleEndTimeMillis:e}))})})}function C0(n){if(!(n instanceof rt)||!n.customData)return!1;const e=Number(n.customData.httpStatus);return e===429||e===500||e===503||e===504}class k0{constructor(){this.listeners=[]}addEventListener(e){this.listeners.push(e)}abort(){this.listeners.forEach(e=>e())}}async function D0(n,e,t,r,i){if(i&&i.global){n("event",t,r);return}else{const s=await e,o={...r,send_to:s};n("event",t,o)}}async function N0(n,e,t,r){{const i=await e;n("config",i,{update:!0,user_id:t})}}async function V0(n,e,t,r){if(r&&r.global){const i={};for(const s of Object.keys(t))i[`user_properties.${s}`]=t[s];return n("set",i),Promise.resolve()}else{const i=await e;n("config",i,{update:!0,user_properties:t})}}/**
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
 */async function O0(){if(_s())try{await la()}catch(n){return xe.warn(et.create("indexeddb-unavailable",{errorInfo:n?.toString()}).message),!1}else return xe.warn(et.create("indexeddb-unavailable",{errorInfo:"IndexedDB is not available in this environment."}).message),!1;return!0}async function x0(n,e,t,r,i,s,o){const c=S0(n);c.then(g=>{t[g.measurementId]=g.appId,n.options.measurementId&&g.measurementId!==n.options.measurementId&&xe.warn(`The measurement ID in the local Firebase config (${n.options.measurementId}) does not match the measurement ID fetched from the server (${g.measurementId}). To ensure analytics events are always sent to the correct Analytics property, update the measurement ID field in the local config or remove it from the local config.`)}).catch(g=>xe.error(g)),e.push(c);const u=O0().then(g=>{if(g)return r.getId()}),[l,f]=await Promise.all([c,u]);E0(s)||m0(s,l.measurementId),i("js",new Date);const p=o?.config??{};return p[u0]="firebase",p.update=!0,f!=null&&(p[c0]=f),i("config",l.measurementId,p),l.measurementId}/**
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
 */class M0{constructor(e){this.app=e}_delete(){return delete Gn[this.app.options.appId],Promise.resolve()}}let Gn={},Pp=[];const Cp={};let Nc="dataLayer",L0="gtag",kp,Ua,Dp=!1;function F0(){const n=[];if(Vu()&&n.push("This is a browser extension environment."),Ou()||n.push("Cookies are not available."),n.length>0){const e=n.map((r,i)=>`(${i+1}) ${r}`).join(" "),t=et.create("invalid-analytics-context",{errorInfo:e});xe.warn(t.message)}}function U0(n,e,t){F0();const r=n.options.appId;if(!r)throw et.create("no-app-id");if(!n.options.apiKey)if(n.options.measurementId)xe.warn(`The "apiKey" field is empty in the local Firebase config. This is needed to fetch the latest measurement ID for this Firebase app. Falling back to the measurement ID ${n.options.measurementId} provided in the "measurementId" field in the local Firebase config.`);else throw et.create("no-api-key");if(Gn[r]!=null)throw et.create("already-exists",{id:r});if(!Dp){g0(Nc);const{wrappedGtag:s,gtagCore:o}=T0(Gn,Pp,Cp,Nc,L0);Ua=s,kp=o,Dp=!0}return Gn[r]=x0(n,Pp,Cp,e,kp,Nc,t),new M0(n)}function KD(n=Ts()){n=K(n);const e=Rt(n,oa);return e.isInitialized()?e.getImmediate():B0(n)}function B0(n,e={}){const t=Rt(n,oa);if(t.isInitialized()){const i=t.getImmediate();if(hn(e,t.getOptions()))return i;throw et.create("already-initialized")}return t.initialize({options:e})}async function HD(){if(Vu()||!Ou()||!_s())return!1;try{return await la()}catch{return!1}}function WD(n,e,t){n=K(n),N0(Ua,Gn[n.app.options.appId],e).catch(r=>xe.error(r))}function $0(n,e,t){n=K(n),V0(Ua,Gn[n.app.options.appId],e,t).catch(r=>xe.error(r))}function q0(n,e,t,r){n=K(n),D0(Ua,Gn[n.app.options.appId],e,t,r).catch(i=>xe.error(i))}const Np="@firebase/analytics",Vp="0.10.19";function j0(){tt(new Ke(oa,(e,{options:t})=>{const r=e.getProvider("app").getImmediate(),i=e.getProvider("installations-internal").getImmediate();return U0(r,i,t)},"PUBLIC")),tt(new Ke("analytics-internal",n,"PRIVATE")),be(Np,Vp),be(Np,Vp,"esm2020");function n(e){try{const t=e.getProvider(oa).getImmediate();return{logEvent:(r,i,s)=>q0(t,r,i,s),setUserProperties:(r,i)=>$0(t,r,i)}}catch(t){throw et.create("interop-component-reg-failed",{reason:t})}}}j0();var bu,Op,Ba=function(){var n=self.performance&&performance.getEntriesByType&&performance.getEntriesByType("navigation")[0];if(n&&n.responseStart>0&&n.responseStart<performance.now())return n},eI=function(n){if(document.readyState==="loading")return"loading";var e=Ba();if(e){if(n<e.domInteractive)return"loading";if(e.domContentLoadedEventStart===0||n<e.domContentLoadedEventStart)return"dom-interactive";if(e.domComplete===0||n<e.domComplete)return"dom-content-loaded"}return"complete"},z0=function(n){var e=n.nodeName;return n.nodeType===1?e.toLowerCase():e.toUpperCase().replace(/^#/,"")},oh=function(n,e){var t="";try{for(;n&&n.nodeType!==9;){var r=n,i=r.id?"#"+r.id:z0(r)+(r.classList&&r.classList.value&&r.classList.value.trim()&&r.classList.value.trim().length?"."+r.classList.value.trim().replace(/\s+/g,"."):"");if(t.length+i.length>(e||100)-1)return t||i;if(t=t?i+">"+t:i,r.id)break;n=r.parentNode}}catch{}return t},tI=-1,G0=function(){return tI},Fs=function(n){addEventListener("pageshow",(function(e){e.persisted&&(tI=e.timeStamp,n(e))}),!0)},ah=function(){var n=Ba();return n&&n.activationStart||0},gn=function(n,e){var t=Ba(),r="navigate";return G0()>=0?r="back-forward-cache":t&&(document.prerendering||ah()>0?r="prerender":document.wasDiscarded?r="restore":t.type&&(r=t.type.replace(/_/g,"-"))),{name:n,value:e===void 0?-1:e,rating:"good",delta:0,entries:[],id:"v4-".concat(Date.now(),"-").concat(Math.floor(8999999999999*Math.random())+1e12),navigationType:r}},ci=function(n,e,t){try{if(PerformanceObserver.supportedEntryTypes.includes(n)){var r=new PerformanceObserver((function(i){Promise.resolve().then((function(){e(i.getEntries())}))}));return r.observe(Object.assign({type:n,buffered:!0},t||{})),r}}catch{}},_n=function(n,e,t,r){var i,s;return function(o){e.value>=0&&(o||r)&&((s=e.value-(i||0))||i===void 0)&&(i=e.value,e.delta=s,e.rating=(function(c,u){return c>u[1]?"poor":c>u[0]?"needs-improvement":"good"})(e.value,t),n(e))}},ch=function(n){requestAnimationFrame((function(){return requestAnimationFrame((function(){return n()}))}))},$a=function(n){document.addEventListener("visibilitychange",(function(){document.visibilityState==="hidden"&&n()}))},uh=function(n){var e=!1;return function(){e||(n(),e=!0)}},vr=-1,xp=function(){return document.visibilityState!=="hidden"||document.prerendering?1/0:0},aa=function(n){document.visibilityState==="hidden"&&vr>-1&&(vr=n.type==="visibilitychange"?n.timeStamp:0,K0())},Mp=function(){addEventListener("visibilitychange",aa,!0),addEventListener("prerenderingchange",aa,!0)},K0=function(){removeEventListener("visibilitychange",aa,!0),removeEventListener("prerenderingchange",aa,!0)},nI=function(){return vr<0&&(vr=xp(),Mp(),Fs((function(){setTimeout((function(){vr=xp(),Mp()}),0)}))),{get firstHiddenTime(){return vr}}},lh=function(n){document.prerendering?addEventListener("prerenderingchange",(function(){return n()}),!0):n()},Lp=[1800,3e3],H0=function(n,e){e=e||{},lh((function(){var t,r=nI(),i=gn("FCP"),s=ci("paint",(function(o){o.forEach((function(c){c.name==="first-contentful-paint"&&(s.disconnect(),c.startTime<r.firstHiddenTime&&(i.value=Math.max(c.startTime-ah(),0),i.entries.push(c),t(!0)))}))}));s&&(t=_n(n,i,Lp,e.reportAllChanges),Fs((function(o){i=gn("FCP"),t=_n(n,i,Lp,e.reportAllChanges),ch((function(){i.value=performance.now()-o.timeStamp,t(!0)}))})))}))},Fp=[.1,.25],W0=function(n,e){(function(t,r){r=r||{},H0(uh((function(){var i,s=gn("CLS",0),o=0,c=[],u=function(f){f.forEach((function(p){if(!p.hadRecentInput){var g=c[0],A=c[c.length-1];o&&p.startTime-A.startTime<1e3&&p.startTime-g.startTime<5e3?(o+=p.value,c.push(p)):(o=p.value,c=[p])}})),o>s.value&&(s.value=o,s.entries=c,i())},l=ci("layout-shift",u);l&&(i=_n(t,s,Fp,r.reportAllChanges),$a((function(){u(l.takeRecords()),i(!0)})),Fs((function(){o=0,s=gn("CLS",0),i=_n(t,s,Fp,r.reportAllChanges),ch((function(){return i()}))})),setTimeout(i,0))})))})((function(t){var r=(function(i){var s,o={};if(i.entries.length){var c=i.entries.reduce((function(l,f){return l&&l.value>f.value?l:f}));if(c&&c.sources&&c.sources.length){var u=(s=c.sources).find((function(l){return l.node&&l.node.nodeType===1}))||s[0];u&&(o={largestShiftTarget:oh(u.node),largestShiftTime:c.startTime,largestShiftValue:c.value,largestShiftSource:u,largestShiftEntry:c,loadState:eI(c.startTime)})}}return Object.assign(i,{attribution:o})})(t);n(r)}),e)},rI=0,Vc=1/0,lo=0,Q0=function(n){n.forEach((function(e){e.interactionId&&(Vc=Math.min(Vc,e.interactionId),lo=Math.max(lo,e.interactionId),rI=lo?(lo-Vc)/7+1:0)}))},iI=function(){return bu?rI:performance.interactionCount||0},J0=function(){"interactionCount"in performance||bu||(bu=ci("event",Q0,{type:"event",buffered:!0,durationThreshold:0}))},ct=[],Ji=new Map,sI=0,Y0=function(){var n=Math.min(ct.length-1,Math.floor((iI()-sI)/50));return ct[n]},oI=[],X0=function(n){if(oI.forEach((function(i){return i(n)})),n.interactionId||n.entryType==="first-input"){var e=ct[ct.length-1],t=Ji.get(n.interactionId);if(t||ct.length<10||n.duration>e.latency){if(t)n.duration>t.latency?(t.entries=[n],t.latency=n.duration):n.duration===t.latency&&n.startTime===t.entries[0].startTime&&t.entries.push(n);else{var r={id:n.interactionId,latency:n.duration,entries:[n]};Ji.set(r.id,r),ct.push(r)}ct.sort((function(i,s){return s.latency-i.latency})),ct.length>10&&ct.splice(10).forEach((function(i){return Ji.delete(i.id)}))}}},hh=function(n){var e=self.requestIdleCallback||self.setTimeout,t=-1;return n=uh(n),document.visibilityState==="hidden"?n():(t=e(n),$a(n)),t},Up=[200,500],Z0=function(n,e){"PerformanceEventTiming"in self&&"interactionId"in PerformanceEventTiming.prototype&&(e=e||{},lh((function(){var t;J0();var r,i=gn("INP"),s=function(c){hh((function(){c.forEach(X0);var u=Y0();u&&u.latency!==i.value&&(i.value=u.latency,i.entries=u.entries,r())}))},o=ci("event",s,{durationThreshold:(t=e.durationThreshold)!==null&&t!==void 0?t:40});r=_n(n,i,Up,e.reportAllChanges),o&&(o.observe({type:"first-input",buffered:!0}),$a((function(){s(o.takeRecords()),r(!0)})),Fs((function(){sI=iI(),ct.length=0,Ji.clear(),i=gn("INP"),r=_n(n,i,Up,e.reportAllChanges)})))})))},Cr=[],tn=[],Ru=0,dh=new WeakMap,kr=new Map,Su=-1,ek=function(n){Cr=Cr.concat(n),aI()},aI=function(){Su<0&&(Su=hh(tk))},tk=function(){kr.size>10&&kr.forEach((function(o,c){Ji.has(c)||kr.delete(c)}));var n=ct.map((function(o){return dh.get(o.entries[0])})),e=tn.length-50;tn=tn.filter((function(o,c){return c>=e||n.includes(o)}));for(var t=new Set,r=0;r<tn.length;r++){var i=tn[r];cI(i.startTime,i.processingEnd).forEach((function(o){t.add(o)}))}var s=Cr.length-1-50;Cr=Cr.filter((function(o,c){return o.startTime>Ru&&c>s||t.has(o)})),Su=-1};oI.push((function(n){n.interactionId&&n.target&&!kr.has(n.interactionId)&&kr.set(n.interactionId,n.target)}),(function(n){var e,t=n.startTime+n.duration;Ru=Math.max(Ru,n.processingEnd);for(var r=tn.length-1;r>=0;r--){var i=tn[r];if(Math.abs(t-i.renderTime)<=8){(e=i).startTime=Math.min(n.startTime,e.startTime),e.processingStart=Math.min(n.processingStart,e.processingStart),e.processingEnd=Math.max(n.processingEnd,e.processingEnd),e.entries.push(n);break}}e||(e={startTime:n.startTime,processingStart:n.processingStart,processingEnd:n.processingEnd,renderTime:t,entries:[n]},tn.push(e)),(n.interactionId||n.entryType==="first-input")&&dh.set(n,e),aI()}));var cI=function(n,e){for(var t,r=[],i=0;t=Cr[i];i++)if(!(t.startTime+t.duration<n)){if(t.startTime>e)break;r.push(t)}return r},nk=function(n,e){Op||(Op=ci("long-animation-frame",ek)),Z0((function(t){var r=(function(i){var s=i.entries[0],o=dh.get(s),c=s.processingStart,u=o.processingEnd,l=o.entries.sort((function(D,j){return D.processingStart-j.processingStart})),f=cI(s.startTime,u),p=i.entries.find((function(D){return D.target})),g=p&&p.target||kr.get(s.interactionId),A=[s.startTime+s.duration,u].concat(f.map((function(D){return D.startTime+D.duration}))),C=Math.max.apply(Math,A),V={interactionTarget:oh(g),interactionTargetElement:g,interactionType:s.name.startsWith("key")?"keyboard":"pointer",interactionTime:s.startTime,nextPaintTime:C,processedEventEntries:l,longAnimationFrameEntries:f,inputDelay:c-s.startTime,processingDuration:u-c,presentationDelay:Math.max(C-u,0),loadState:eI(s.startTime)};return Object.assign(i,{attribution:V})})(t);n(r)}),e)},Bp=[2500,4e3],Oc={},rk=function(n,e){(function(t,r){r=r||{},lh((function(){var i,s=nI(),o=gn("LCP"),c=function(f){r.reportAllChanges||(f=f.slice(-1)),f.forEach((function(p){p.startTime<s.firstHiddenTime&&(o.value=Math.max(p.startTime-ah(),0),o.entries=[p],i())}))},u=ci("largest-contentful-paint",c);if(u){i=_n(t,o,Bp,r.reportAllChanges);var l=uh((function(){Oc[o.id]||(c(u.takeRecords()),u.disconnect(),Oc[o.id]=!0,i(!0))}));["keydown","click"].forEach((function(f){addEventListener(f,(function(){return hh(l)}),{once:!0,capture:!0})})),$a(l),Fs((function(f){o=gn("LCP"),i=_n(t,o,Bp,r.reportAllChanges),ch((function(){o.value=performance.now()-f.timeStamp,Oc[o.id]=!0,i(!0)}))}))}}))})((function(t){var r=(function(i){var s={timeToFirstByte:0,resourceLoadDelay:0,resourceLoadDuration:0,elementRenderDelay:i.value};if(i.entries.length){var o=Ba();if(o){var c=o.activationStart||0,u=i.entries[i.entries.length-1],l=u.url&&performance.getEntriesByType("resource").filter((function(C){return C.name===u.url}))[0],f=Math.max(0,o.responseStart-c),p=Math.max(f,l?(l.requestStart||l.startTime)-c:0),g=Math.max(p,l?l.responseEnd-c:0),A=Math.max(g,u.startTime-c);s={element:oh(u.element),timeToFirstByte:f,resourceLoadDelay:p-f,resourceLoadDuration:g-p,elementRenderDelay:A-g,navigationEntry:o,lcpEntry:u},u.url&&(s.url=u.url),l&&(s.lcpResourceEntry=l)}}return Object.assign(i,{attribution:s})})(t);n(r)}),e)};const $p="@firebase/performance",Pu="0.7.9";/**
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
 */const uI=Pu,ik="FB-PERF-TRACE-START",sk="FB-PERF-TRACE-STOP",Cu="FB-PERF-TRACE-MEASURE",lI="_wt_",hI="_fp",dI="_fcp",fI="_fid",pI="_lcp",ok="lcp_element",mI="_inp",ak="inp_interactionTarget",gI="_cls",ck="cls_largestShiftTarget",_I="@firebase/performance/config",yI="@firebase/performance/configexpire",uk="performance",II="Performance";/**
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
 */const lk={"trace started":"Trace {$traceName} was started before.","trace stopped":"Trace {$traceName} is not running.","nonpositive trace startTime":"Trace {$traceName} startTime should be positive.","nonpositive trace duration":"Trace {$traceName} duration should be positive.","no window":"Window is not available.","no app id":"App id is not available.","no project id":"Project id is not available.","no api key":"Api key is not available.","invalid cc log":"Attempted to queue invalid cc event","FB not default":"Performance can only start when Firebase app instance is the default one.","RC response not ok":"RC response is not ok","invalid attribute name":"Attribute name {$attributeName} is invalid.","invalid attribute value":"Attribute value {$attributeValue} is invalid.","invalid custom metric name":"Custom metric name {$customMetricName} is invalid","invalid String merger input":"Input for String merger is invalid, contact support team to resolve.","already initialized":"initializePerformance() has already been called with different options. To avoid this error, call initializePerformance() with the same options as when it was originally called, or call getPerformance() to return the already initialized instance."},Ve=new yn(uk,II,lk);/**
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
 */const Mt=new Is(II);Mt.logLevel=J.INFO;/**
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
 */let xc,TI;class Te{constructor(e){if(this.window=e,!e)throw Ve.create("no window");this.performance=e.performance,this.PerformanceObserver=e.PerformanceObserver,this.windowLocation=e.location,this.navigator=e.navigator,this.document=e.document,this.navigator&&this.navigator.cookieEnabled&&(this.localStorage=e.localStorage),e.perfMetrics&&e.perfMetrics.onFirstInputDelay&&(this.onFirstInputDelay=e.perfMetrics.onFirstInputDelay),this.onLCP=rk,this.onINP=nk,this.onCLS=W0}getUrl(){return this.windowLocation.href.split("?")[0]}mark(e){!this.performance||!this.performance.mark||this.performance.mark(e)}measure(e,t,r){!this.performance||!this.performance.measure||this.performance.measure(e,t,r)}getEntriesByType(e){return!this.performance||!this.performance.getEntriesByType?[]:this.performance.getEntriesByType(e)}getEntriesByName(e){return!this.performance||!this.performance.getEntriesByName?[]:this.performance.getEntriesByName(e)}getTimeOrigin(){return this.performance&&(this.performance.timeOrigin||this.performance.timing.navigationStart)}requiredApisAvailable(){return!fetch||!Promise||!Ou()?(Mt.info("Firebase Performance cannot start if browser does not support fetch and Promise or cookie is disabled."),!1):_s()?!0:(Mt.info("IndexedDB is not supported by current browser"),!1)}setupObserver(e,t){if(!this.PerformanceObserver)return;new this.PerformanceObserver(i=>{for(const s of i.getEntries())t(s)}).observe({entryTypes:[e]})}static getInstance(){return xc===void 0&&(xc=new Te(TI)),xc}}function hk(n){TI=n}/**
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
 */let EI;function dk(n){const e=n.getId();return e.then(t=>{EI=t}),e}function fh(){return EI}function fk(n){const e=n.getToken();return e.then(t=>{}),e}/**
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
 */function qp(n,e){const t=n.length-e.length;if(t<0||t>1)throw Ve.create("invalid String merger input");const r=[];for(let i=0;i<n.length;i++)r.push(n.charAt(i)),e.length>i&&r.push(e.charAt(i));return r.join("")}/**
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
 */let Mc;class Ue{constructor(){this.instrumentationEnabled=!0,this.dataCollectionEnabled=!0,this.loggingEnabled=!1,this.tracesSamplingRate=1,this.networkRequestsSamplingRate=1,this.logEndPointUrl="https://firebaselogging.googleapis.com/v0cc/log?format=json_proto",this.flTransportEndpointUrl=qp("hts/frbslgigp.ogepscmv/ieo/eaylg","tp:/ieaeogn-agolai.o/1frlglgc/o"),this.transportKey=qp("AzSC8r6ReiGqFMyfvgow","Iayx0u-XT3vksVM-pIV"),this.logSource=462,this.logTraceAfterSampling=!1,this.logNetworkAfterSampling=!1,this.configTimeToLive=12,this.logMaxFlushSize=40}getFlTransportFullUrl(){return this.flTransportEndpointUrl.concat("?key=",this.transportKey)}static getInstance(){return Mc===void 0&&(Mc=new Ue),Mc}}/**
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
 */var Yi;(function(n){n[n.UNKNOWN=0]="UNKNOWN",n[n.VISIBLE=1]="VISIBLE",n[n.HIDDEN=2]="HIDDEN"})(Yi||(Yi={}));const pk=["firebase_","google_","ga_"],mk=new RegExp("^[a-zA-Z]\\w*$"),gk=40,ku=100;function _k(){const n=Te.getInstance().navigator;return n?.serviceWorker?n.serviceWorker.controller?2:3:1}function yk(){switch(Te.getInstance().document.visibilityState){case"visible":return Yi.VISIBLE;case"hidden":return Yi.HIDDEN;default:return Yi.UNKNOWN}}function Ik(){const e=Te.getInstance().navigator.connection;switch(e&&e.effectiveType){case"slow-2g":return 1;case"2g":return 2;case"3g":return 3;case"4g":return 4;default:return 0}}function Tk(n){return n.length===0||n.length>gk?!1:!pk.some(t=>n.startsWith(t))&&!!n.match(mk)}function Ek(n){return n.length!==0&&n.length<=ku}/**
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
 */function wI(n){const e=n.options?.appId;if(!e)throw Ve.create("no app id");return e}function wk(n){const e=n.options?.projectId;if(!e)throw Ve.create("no project id");return e}function vk(n){const e=n.options?.apiKey;if(!e)throw Ve.create("no api key");return e}/**
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
 */const Ak="0.0.1",We={loggingEnabled:!0},bk="FIREBASE_INSTALLATIONS_AUTH";function Rk(n,e){const t=Sk();return t?(jp(t),Promise.resolve()):kk(n,e).then(jp).then(r=>Pk(r),()=>{})}function Sk(){const n=Te.getInstance().localStorage;if(!n)return;const e=n.getItem(yI);if(!e||!Dk(e))return;const t=n.getItem(_I);if(t)try{return JSON.parse(t)}catch{return}}function Pk(n){const e=Te.getInstance().localStorage;!n||!e||(e.setItem(_I,JSON.stringify(n)),e.setItem(yI,String(Date.now()+Ue.getInstance().configTimeToLive*60*60*1e3)))}const Ck="Could not fetch config, will use default configs";function kk(n,e){return fk(n.installations).then(t=>{const r=wk(n.app),i=vk(n.app),s=`https://firebaseremoteconfig.googleapis.com/v1/projects/${r}/namespaces/fireperf:fetch?key=${i}`,o=new Request(s,{method:"POST",headers:{Authorization:`${bk} ${t}`},body:JSON.stringify({app_instance_id:e,app_instance_id_token:t,app_id:wI(n.app),app_version:uI,sdk_version:Ak})});return fetch(o).then(c=>{if(c.ok)return c.json();throw Ve.create("RC response not ok")})}).catch(()=>{Mt.info(Ck)})}function jp(n){if(!n)return n;const e=Ue.getInstance(),t=n.entries||{};return t.fpr_enabled!==void 0?e.loggingEnabled=String(t.fpr_enabled)==="true":e.loggingEnabled=We.loggingEnabled,t.fpr_log_source?e.logSource=Number(t.fpr_log_source):We.logSource&&(e.logSource=We.logSource),t.fpr_log_endpoint_url?e.logEndPointUrl=t.fpr_log_endpoint_url:We.logEndPointUrl&&(e.logEndPointUrl=We.logEndPointUrl),t.fpr_log_transport_key?e.transportKey=t.fpr_log_transport_key:We.transportKey&&(e.transportKey=We.transportKey),t.fpr_vc_network_request_sampling_rate!==void 0?e.networkRequestsSamplingRate=Number(t.fpr_vc_network_request_sampling_rate):We.networkRequestsSamplingRate!==void 0&&(e.networkRequestsSamplingRate=We.networkRequestsSamplingRate),t.fpr_vc_trace_sampling_rate!==void 0?e.tracesSamplingRate=Number(t.fpr_vc_trace_sampling_rate):We.tracesSamplingRate!==void 0&&(e.tracesSamplingRate=We.tracesSamplingRate),t.fpr_log_max_flush_size?e.logMaxFlushSize=Number(t.fpr_log_max_flush_size):We.logMaxFlushSize&&(e.logMaxFlushSize=We.logMaxFlushSize),e.logTraceAfterSampling=zp(e.tracesSamplingRate),e.logNetworkAfterSampling=zp(e.networkRequestsSamplingRate),n}function Dk(n){return Number(n)>Date.now()}function zp(n){return Math.random()<=n}/**
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
 */let ph=1,Lc;function vI(n){return ph=2,Lc=Lc||Vk(n),Lc}function Nk(){return ph===3}function Vk(n){return Ok().then(()=>dk(n.installations)).then(e=>Rk(n,e)).then(()=>Gp(),()=>Gp())}function Ok(){const n=Te.getInstance().document;return new Promise(e=>{if(n&&n.readyState!=="complete"){const t=()=>{n.readyState==="complete"&&(n.removeEventListener("readystatechange",t),e())};n.addEventListener("readystatechange",t)}else e()})}function Gp(){ph=3}/**
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
 */const AI=10*1e3,xk=5.5*1e3,Mk=1e3,bI=3,Lk=65536,Fk=new TextEncoder;let Co=bI,it=[],Kp=!1;function Uk(){Kp||(mh(xk),Kp=!0)}function mh(n){setTimeout(()=>{Co<=0||(it.length>0&&Bk(),mh(AI))},n)}function Bk(){const n=it.splice(0,Mk),e=Du(n);$k(e).then(()=>{Co=bI}).catch(()=>{it=[...n,...it],Co--,Mt.info(`Tries left: ${Co}.`),mh(AI)})}function Du(n){const e=n.map(r=>({source_extension_json_proto3:r.message,event_time_ms:String(r.eventTime)})),t={request_time_ms:String(Date.now()),client_info:{client_type:1,js_client_info:{}},log_source:Ue.getInstance().logSource,log_event:e};return JSON.stringify(t)}function $k(n){const e=Ue.getInstance().getFlTransportFullUrl();return Fk.encode(n).length<=Lk&&navigator.sendBeacon&&navigator.sendBeacon(e,n)?Promise.resolve():fetch(e,{method:"POST",body:n})}function qk(n){if(!n.eventTime||!n.message)throw Ve.create("invalid cc log");it=[...it,n]}function jk(n){return(...e)=>{const t=n(...e);qk({message:t,eventTime:Date.now()})}}function zk(){const n=Ue.getInstance().getFlTransportFullUrl();for(;it.length>0;){const e=it.splice(-Ue.getInstance().logMaxFlushSize),t=Du(e);if(!(navigator.sendBeacon&&navigator.sendBeacon(n,t))){it=[...it,...e];break}}if(it.length>0){const e=Du(it);fetch(n,{method:"POST",body:e}).catch(()=>{Mt.info("Failed flushing queued events.")})}}/**
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
 */let Xi;function RI(n,e){Xi||(Xi={send:jk(Hk),flush:zk}),Xi.send(n,e)}function ho(n){const e=Ue.getInstance();!e.instrumentationEnabled&&n.isAuto||!e.dataCollectionEnabled&&!n.isAuto||Te.getInstance().requiredApisAvailable()&&(Nk()?Fc(n):vI(n.performanceController).then(()=>Fc(n),()=>Fc(n)))}function Gk(){Xi&&Xi.flush()}function Fc(n){if(!fh())return;const e=Ue.getInstance();!e.loggingEnabled||!e.logTraceAfterSampling||RI(n,1)}function Kk(n){const e=Ue.getInstance();if(!e.instrumentationEnabled)return;const t=n.url,r=e.logEndPointUrl.split("?")[0],i=e.flTransportEndpointUrl.split("?")[0];t===r||t===i||!e.loggingEnabled||!e.logNetworkAfterSampling||RI(n,0)}function Hk(n,e){return e===0?Wk(n):Qk(n)}function Wk(n){const e={url:n.url,http_method:n.httpMethod||0,http_response_code:200,response_payload_bytes:n.responsePayloadBytes,client_start_time_us:n.startTimeUs,time_to_response_initiated_us:n.timeToResponseInitiatedUs,time_to_response_completed_us:n.timeToResponseCompletedUs},t={application_info:SI(n.performanceController.app),network_request_metric:e};return JSON.stringify(t)}function Qk(n){const e={name:n.name,is_auto:n.isAuto,client_start_time_us:n.startTimeUs,duration_us:n.durationUs};Object.keys(n.counters).length!==0&&(e.counters=n.counters);const t=n.getAttributes();Object.keys(t).length!==0&&(e.custom_attributes=t);const r={application_info:SI(n.performanceController.app),trace_metric:e};return JSON.stringify(r)}function SI(n){return{google_app_id:wI(n),app_instance_id:fh(),web_app_info:{sdk_version:uI,page_url:Te.getInstance().getUrl(),service_worker_status:_k(),visibility_state:yk(),effective_connection_type:Ik()},application_process_state:0}}/**
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
 */function Hp(n,e){const t=e;if(!t||t.responseStart===void 0)return;const r=Te.getInstance().getTimeOrigin(),i=Math.floor((t.startTime+r)*1e3),s=t.responseStart?Math.floor((t.responseStart-t.startTime)*1e3):void 0,o=Math.floor((t.responseEnd-t.startTime)*1e3),c=t.name&&t.name.split("?")[0],u={performanceController:n,url:c,responsePayloadBytes:t.transferSize,startTimeUs:i,timeToResponseInitiatedUs:s,timeToResponseCompletedUs:o};Kk(u)}/**
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
 */const Jk=100,Yk="_",Xk=[hI,dI,fI,pI,gI,mI];function Zk(n,e){return n.length===0||n.length>Jk?!1:e&&e.startsWith(lI)&&Xk.indexOf(n)>-1||!n.startsWith(Yk)}function eD(n){const e=Math.floor(n);return e<n&&Mt.info(`Metric value should be an Integer, setting the value as : ${e}.`),e}/**
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
 */class gs{constructor(e,t,r=!1,i){this.performanceController=e,this.name=t,this.isAuto=r,this.state=1,this.customAttributes={},this.counters={},this.api=Te.getInstance(),this.randomId=Math.floor(Math.random()*1e6),this.isAuto||(this.traceStartMark=`${ik}-${this.randomId}-${this.name}`,this.traceStopMark=`${sk}-${this.randomId}-${this.name}`,this.traceMeasure=i||`${Cu}-${this.randomId}-${this.name}`,i&&this.calculateTraceMetrics())}start(){if(this.state!==1)throw Ve.create("trace started",{traceName:this.name});this.api.mark(this.traceStartMark),this.state=2}stop(){if(this.state!==2)throw Ve.create("trace stopped",{traceName:this.name});this.state=3,this.api.mark(this.traceStopMark),this.api.measure(this.traceMeasure,this.traceStartMark,this.traceStopMark),this.calculateTraceMetrics(),ho(this)}record(e,t,r){if(e<=0)throw Ve.create("nonpositive trace startTime",{traceName:this.name});if(t<=0)throw Ve.create("nonpositive trace duration",{traceName:this.name});if(this.durationUs=Math.floor(t*1e3),this.startTimeUs=Math.floor(e*1e3),r&&r.attributes&&(this.customAttributes={...r.attributes}),r&&r.metrics)for(const i of Object.keys(r.metrics))isNaN(Number(r.metrics[i]))||(this.counters[i]=Math.floor(Number(r.metrics[i])));ho(this)}incrementMetric(e,t=1){this.counters[e]===void 0?this.putMetric(e,t):this.putMetric(e,this.counters[e]+t)}putMetric(e,t){if(Zk(e,this.name))this.counters[e]=eD(t??0);else throw Ve.create("invalid custom metric name",{customMetricName:e})}getMetric(e){return this.counters[e]||0}putAttribute(e,t){const r=Tk(e),i=Ek(t);if(r&&i){this.customAttributes[e]=t;return}if(!r)throw Ve.create("invalid attribute name",{attributeName:e});if(!i)throw Ve.create("invalid attribute value",{attributeValue:t})}getAttribute(e){return this.customAttributes[e]}removeAttribute(e){this.customAttributes[e]!==void 0&&delete this.customAttributes[e]}getAttributes(){return{...this.customAttributes}}setStartTime(e){this.startTimeUs=e}setDuration(e){this.durationUs=e}calculateTraceMetrics(){const e=this.api.getEntriesByName(this.traceMeasure),t=e&&e[0];t&&(this.durationUs=Math.floor(t.duration*1e3),this.startTimeUs=Math.floor((t.startTime+this.api.getTimeOrigin())*1e3))}static createOobTrace(e,t,r,i,s){const o=Te.getInstance().getUrl();if(!o)return;const c=new gs(e,lI+o,!0),u=Math.floor(Te.getInstance().getTimeOrigin()*1e3);c.setStartTime(u),t&&t[0]&&(c.setDuration(Math.floor(t[0].duration*1e3)),c.putMetric("domInteractive",Math.floor(t[0].domInteractive*1e3)),c.putMetric("domContentLoadedEventEnd",Math.floor(t[0].domContentLoadedEventEnd*1e3)),c.putMetric("loadEventEnd",Math.floor(t[0].loadEventEnd*1e3)));const l="first-paint",f="first-contentful-paint";if(r){const p=r.find(A=>A.name===l);p&&p.startTime&&c.putMetric(hI,Math.floor(p.startTime*1e3));const g=r.find(A=>A.name===f);g&&g.startTime&&c.putMetric(dI,Math.floor(g.startTime*1e3)),s&&c.putMetric(fI,Math.floor(s*1e3))}this.addWebVitalMetric(c,pI,ok,i.lcp),this.addWebVitalMetric(c,gI,ck,i.cls),this.addWebVitalMetric(c,mI,ak,i.inp),ho(c),Gk()}static addWebVitalMetric(e,t,r,i){i&&(e.putMetric(t,Math.floor(i.value*1e3)),i.elementAttribution&&(i.elementAttribution.length>ku?e.putAttribute(r,i.elementAttribution.substring(0,ku)):e.putAttribute(r,i.elementAttribution)))}static createUserTimingTrace(e,t){const r=new gs(e,t,!1,t);ho(r)}}/**
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
 */let ko={},Wp=!1,PI;function Qp(n){fh()&&(setTimeout(()=>nD(n),0),setTimeout(()=>tD(n),0),setTimeout(()=>rD(n),0))}function tD(n){const e=Te.getInstance(),t=e.getEntriesByType("resource");for(const r of t)Hp(n,r);e.setupObserver("resource",r=>Hp(n,r))}function nD(n){const e=Te.getInstance();"onpagehide"in window?e.document.addEventListener("pagehide",()=>Uc(n)):e.document.addEventListener("unload",()=>Uc(n)),e.document.addEventListener("visibilitychange",()=>{e.document.visibilityState==="hidden"&&Uc(n)}),e.onFirstInputDelay&&e.onFirstInputDelay(t=>{PI=t}),e.onLCP(t=>{ko.lcp={value:t.value,elementAttribution:t.attribution?.element}}),e.onCLS(t=>{ko.cls={value:t.value,elementAttribution:t.attribution?.largestShiftTarget}}),e.onINP(t=>{ko.inp={value:t.value,elementAttribution:t.attribution?.interactionTarget}})}function rD(n){const e=Te.getInstance(),t=e.getEntriesByType("measure");for(const r of t)Jp(n,r);e.setupObserver("measure",r=>Jp(n,r))}function Jp(n,e){const t=e.name;t.substring(0,Cu.length)!==Cu&&gs.createUserTimingTrace(n,t)}function Uc(n){if(!Wp){Wp=!0;const e=Te.getInstance(),t=e.getEntriesByType("navigation"),r=e.getEntriesByType("paint");setTimeout(()=>{gs.createOobTrace(n,t,r,ko,PI)},0)}}/**
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
 */class iD{constructor(e,t){this.app=e,this.installations=t,this.initialized=!1}_init(e){this.initialized||(e?.dataCollectionEnabled!==void 0&&(this.dataCollectionEnabled=e.dataCollectionEnabled),e?.instrumentationEnabled!==void 0&&(this.instrumentationEnabled=e.instrumentationEnabled),Te.getInstance().requiredApisAvailable()?la().then(t=>{t&&(Uk(),vI(this).then(()=>Qp(this),()=>Qp(this)),this.initialized=!0)}).catch(t=>{Mt.info(`Environment doesn't support IndexedDB: ${t}`)}):Mt.info('Firebase Performance cannot start if the browser does not support "Fetch" and "Promise", or cookies are disabled.'))}set instrumentationEnabled(e){Ue.getInstance().instrumentationEnabled=e}get instrumentationEnabled(){return Ue.getInstance().instrumentationEnabled}set dataCollectionEnabled(e){Ue.getInstance().dataCollectionEnabled=e}get dataCollectionEnabled(){return Ue.getInstance().dataCollectionEnabled}}const sD="[DEFAULT]";function QD(n=Ts()){return n=K(n),Rt(n,"performance").getImmediate()}const oD=(n,{options:e})=>{const t=n.getProvider("app").getImmediate(),r=n.getProvider("installations-internal").getImmediate();if(t.name!==sD)throw Ve.create("FB not default");if(typeof window>"u")throw Ve.create("no window");hk(window);const i=new iD(t,r);return i._init(e),i};function aD(){tt(new Ke("performance",oD,"PUBLIC")),be($p,Pu),be($p,Pu,"esm2020")}aD();export{ED as A,vD as B,AD as C,WD as D,$0 as E,q0 as F,RD as G,dD as H,qD as I,UD as J,BD as K,$D as L,mD as M,ID as N,fD as O,bD as P,CD as Q,kD as R,PD as S,te as T,SD as U,hD as a,jD as b,zD as c,HD as d,KD as e,QD as f,FD as g,yD as h,kE as i,LR as j,DD as k,VD as l,ND as m,LD as n,GD as o,_D as p,MD as q,Kb as r,xD as s,TD as t,OD as u,lb as v,wD as w,pD as x,gD as y,lD as z};
