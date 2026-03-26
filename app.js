// =======================
// VARIABLES GLOBALES
// =======================
let preguntas = []
let index = 0
let aciertos = 0
let seleccion = null
let areaSeleccionada = 1

let tiempo = 0
let intervalo = null


// =======================
// CAMBIO DE MODULOS
// =======================
function mostrarModulo(modulo){

document.querySelectorAll(".modulo")
.forEach(m=>m.style.display="none")

document.getElementById("mod-"+modulo).style.display="block"

if(modulo === "historial") cargarHistorial()
if(modulo === "ranking") cargarRanking()
if(modulo === "perfil") cargarPerfil()

}


// =======================
// INICIAR SIMULACRO
// =======================
function iniciarSimulacro(area){

areaSeleccionada = area

preguntas = []
index = 0
aciertos = 0
seleccion = null

// reconstruir estructura por si viene del resultado
restaurarSimulacroUI()

document.getElementById("menu").style.display="none"

iniciarTiempo()
cargarDatos()

}


// =======================
// RESTAURAR UI
// =======================
function restaurarSimulacroUI(){

document.getElementById("mod-simulacro").innerHTML = `

<div id="menu">
<h3>Selecciona el área</h3>

<button onclick="iniciarSimulacro(1)">Matemáticas</button>
<button onclick="iniciarSimulacro(2)">Lectura Crítica</button>
<button onclick="iniciarSimulacro(3)">Sociales</button>
<button onclick="iniciarSimulacro(4)">Naturales</button>
<button onclick="iniciarSimulacro(5)">Inglés</button>
</div>

<p id="stats"></p>
<p id="tiempo">Tiempo: 00:00</p>

<div id="enunciado"></div>
<div id="opciones"></div>

<button id="btn" onclick="siguiente()" style="display:none;">
Siguiente
</button>

`

}


// =======================
// TEMPORIZADOR
// =======================
function iniciarTiempo(){

tiempo = 0
clearInterval(intervalo)

intervalo = setInterval(()=>{

tiempo++

const m = Math.floor(tiempo/60).toString().padStart(2,"0")
const s = (tiempo%60).toString().padStart(2,"0")

const el = document.getElementById("tiempo")
if(el) el.innerText = `Tiempo: ${m}:${s}`

},1000)

}


// =======================
// CARGAR PREGUNTAS
// =======================
async function cargarDatos(){

try{

const res = await fetch(`http://localhost:3000/api/preguntas?area=${areaSeleccionada}`)
preguntas = await res.json()

if(!preguntas.length){
document.getElementById("stats").innerText="No hay preguntas"
return
}

render()

}catch(e){
console.log(e)
}

}


// =======================
// RENDER
// =======================
function render(){

const p = preguntas[index]

document.getElementById("stats").innerText =
`Pregunta ${index+1} de ${preguntas.length}`

document.getElementById("enunciado").innerHTML = p.enunciado

const cont = document.getElementById("opciones")
cont.innerHTML = ""

document.getElementById("btn").style.display="none"

seleccion = null

const opciones = [p.opcion_a,p.opcion_b,p.opcion_c,p.opcion_d]

opciones.forEach((texto,i)=>{

const letra = ["A","B","C","D"][i]

const btn = document.createElement("button")
btn.className="opcion"
btn.innerHTML = `${letra}. ${texto}`

btn.onclick = ()=>{

// 🔒 evitar cambiar respuesta
if(seleccion) return

document.querySelectorAll(".opcion")
.forEach(o=>o.classList.remove("selected"))

btn.classList.add("selected")

seleccion = letra

document.getElementById("btn").style.display="block"

// 📱 SCROLL AUTOMÁTICO (IMPORTANTE)
window.scrollTo({
    top: document.body.scrollHeight,
    behavior: "smooth"
})

}

cont.appendChild(btn)

})

MathJax.typesetPromise()

}


// =======================
// SIGUIENTE
// =======================
async function siguiente(){

if(!seleccion) return

const id = preguntas[index].id_pregunta

const res = await fetch(
`http://localhost:3000/api/validar/${id}/${seleccion}`
)

const data = await res.json()

const correcta = preguntas[index].respuesta_correcta

document.querySelectorAll(".opcion").forEach(btn=>{

const letra = btn.innerText.charAt(0)

if(letra===correcta) btn.classList.add("correcta")

if(letra===seleccion && !data.correcta)
btn.classList.add("incorrecta")

})

if(data.correcta) aciertos++

index++

setTimeout(()=>{
if(index<preguntas.length) render()
else resultado()
},1000)

}

// =======================
// RESULTADO
// =======================
async function resultado(){

clearInterval(intervalo)

const porcentaje = Math.round((aciertos/preguntas.length)*100)

if(porcentaje>=70){
confetti({
particleCount:150,
spread:70
})
}

const tiempoFinal = document.getElementById("tiempo").innerText.replace("Tiempo: ","")

// 🔥 OCULTAR cosas del simulacro
document.getElementById("opciones").style.display = "none"
document.getElementById("btn").style.display = "none"
document.getElementById("enunciado").style.display = "none"

// 🔥 MOSTRAR MENÚ DE NUEVO
document.getElementById("menu").style.display = "none"

// 🔥 MOSTRAR RESULTADO
document.getElementById("stats").innerHTML = `
<h2>Resultado</h2>
<h1>${aciertos}/${preguntas.length}</h1>
<p>${porcentaje}%</p>
<p>Tiempo total: ${tiempoFinal}</p>

<div class="botones-resultado">
<button class="btn-final btn-reintentar" onclick="reintentarMismaArea()">
🔄 Reintentar misma área
</button>

<button class="btn-final btn-volver" onclick="volverSimulacros()">
📚 Elegir otra área
</button>
</div>
`

// guardar intento
const user = JSON.parse(localStorage.getItem("usuario"))

await fetch("http://localhost:3000/api/guardar-intento",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
puntaje:aciertos,
total:preguntas.length,
id_usuario:user.id_usuario,
id_area:areaSeleccionada
})
})

}


// =======================
// REINTENTAR / VOLVER
// =======================
function reintentarMismaArea(){
iniciarSimulacro(areaSeleccionada)
}

function volverSimulacros(){
restaurarSimulacroUI()
mostrarModulo("simulacro")
}


// =======================
// HISTORIAL
// =======================
async function cargarHistorial(){

const user = JSON.parse(localStorage.getItem("usuario"))

const res = await fetch(`http://localhost:3000/api/historial/${user.id_usuario}`)
const data = await res.json()

let html = "<table style='width:100%;text-align:center'>"

html += `
<tr>
<th>Fecha</th>
<th>Puntaje</th>
<th>Total</th>
<th>%</th>
</tr>
`

data.forEach(i=>{

const porcentaje = Math.round((i.puntaje_obtenido/i.total_preguntas)*100)

html += `
<tr>
<td>${new Date(i.fecha).toLocaleDateString()}</td>
<td>${i.puntaje_obtenido}</td>
<td>${i.total_preguntas}</td>
<td>${porcentaje}%</td>
</tr>
`

})

html += "</table>"

document.getElementById("lista-historial").innerHTML = html

}


// =======================
// RANKING
// =======================
async function cargarRanking(){

const res = await fetch("http://localhost:3000/api/ranking")
const data = await res.json()

let html = "<table style='width:100%;text-align:center'>"

html += `
<tr>
<th>Usuario</th>
<th>Puntaje</th>
<th>Área</th>
</tr>
`

data.forEach(r=>{

html += `
<tr>
<td>${r.nombre}</td>
<td>${r.mejor_puntaje}</td>
<td>${r.nombre_area}</td>
</tr>
`

})

html += "</table>"

document.getElementById("lista-ranking").innerHTML = html

}


// =======================
// PERFIL
// =======================
async function cargarPerfil(){

const user = JSON.parse(localStorage.getItem("usuario"))

const res = await fetch(`http://localhost:3000/api/perfil/${user.id_usuario}`)
const data = await res.json()

document.getElementById("perfil-nombre").innerText = data.nombre
document.getElementById("perfil-correo").innerText = data.correo
document.getElementById("perfil-intentos").innerText = data.intentos || 0
document.getElementById("perfil-mejor").innerText = data.mejor || 0

}


// =======================
// LOGIN
// =======================
async function login(){

const correo = document.getElementById("correo").value
const password = document.getElementById("password").value

const res = await fetch("http://localhost:3000/api/login",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({correo,password})
})

const data = await res.json()

if(data.error){
document.getElementById("auth-msg").innerText="Credenciales incorrectas"
return
}

localStorage.setItem("usuario", JSON.stringify(data))

document.getElementById("auth").style.display="none"

mostrarModulo("inicio")

}


// =======================
// REGISTRO
// =======================
async function registro(){

const nombre = document.getElementById("nombre").value
const correo = document.getElementById("correo").value
const password = document.getElementById("password").value

if(!nombre || !correo || !password){
document.getElementById("auth-msg").innerText="Completa todos los campos"
return
}

const res = await fetch("http://localhost:3000/api/registro",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({nombre,correo,password})
})

const data = await res.json()

if(data.error){
document.getElementById("auth-msg").innerText=data.error
return
}

document.getElementById("auth-msg").innerText="Usuario creado, ahora inicia sesión"

}


// =======================
// AUTO LOGIN
// =======================
window.onload = ()=>{

let user = localStorage.getItem("usuario")

try{
user = JSON.parse(user)
}catch{
user = null
}

if(user && user.id_usuario){
mostrarModulo("inicio")
}else{
document.getElementById("auth").style.display="flex"
}

}