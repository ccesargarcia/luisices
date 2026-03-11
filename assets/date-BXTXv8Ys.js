import{c as i}from"./main-CVuluRMm.js";/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const r=[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"7 10 12 15 17 10",key:"2ggqvy"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3",key:"1vk2je"}]],m=i("download",r);function n(t){const[o,a,e]=t.split("-").map(Number);return new Date(o,a-1,e)}function g(t){return n(t).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric"})}function c(t){return n(t).toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"})}function y(t){return n(t).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}function D(t){return n(t).toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})}function d(t){return new Date(t).toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"})}function f(t){return/^\d{4}-\d{2}-\d{2}$/.test(t)?c(t):d(t)}export{m as D,D as a,y as b,f as c,d,g as f,n as p};
