// ⚙️ CONFIGURACION
const API = "http://localhost:3000"
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
    // 🔐 Proteger admin
    if (modulo === "admin") {
        const user = JSON.parse(localStorage.getItem("usuario"))
        if (!user || !user.es_admin) {
            alert("⛔ No tienes permiso para acceder aquí")
            return
        }
    }

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
 <div id="contexto"></div>

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

const res = await fetch(`${API}/api/preguntas?area=${areaSeleccionada}`)
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
function render() {
    // 1. Validar que existan preguntas
    if (!preguntas || !preguntas[index]) return;

    const p = preguntas[index];

    // 2. Tomar elementos del DOM
    const contextoDiv = document.getElementById("contexto");
    const enunciadoDiv = document.getElementById("enunciado");
    const opcionesDiv = document.getElementById("opciones");
    const btnSiguiente = document.getElementById("btn");
    const statsDiv = document.getElementById("stats");

    // 3. Validar que existan
    if (!enunciadoDiv) {
        console.error("Falta el elemento #enunciado en el HTML");
        return;
    }

    if (!opcionesDiv) {
        console.error("Falta el elemento #opciones en el HTML");
        return;
    }

    if (!btnSiguiente) {
        console.error("Falta el elemento #btn en el HTML");
        return;
    }

    if (!statsDiv) {
        console.error("Falta el elemento #stats en el HTML");
        return;
    }

    // 4. Mostrar contexto si existe
    if (contextoDiv) {
        if (p.contexto) {
            contextoDiv.style.display = "block";
            contextoDiv.innerHTML = p.contexto;
        } else {
            contextoDiv.style.display = "none";
            contextoDiv.innerHTML = "";
        }
    }

    // 5. Asegurar visibilidad
    enunciadoDiv.style.display = "block";
    opcionesDiv.style.display = "block";
    btnSiguiente.style.display = "none";
    // ✅ Rehabilitar botón
btnSiguiente.disabled = false
btnSiguiente.innerText = "Siguiente"

    // 6. Progreso
    statsDiv.innerText = `Pregunta ${index + 1} de ${preguntas.length}`;

    // 7. Enunciado
    enunciadoDiv.innerHTML = p.enunciado;
    // ✅ Zoom
enunciadoDiv.querySelectorAll("img").forEach(img => {
    img.onclick = () => abrirZoom(img.src)
})

if (contextoDiv) {
    contextoDiv.querySelectorAll("img").forEach(img => {
        img.onclick = () => abrirZoom(img.src)
    })
}

    // 8. Opciones
    opcionesDiv.innerHTML = "";
    seleccion = null;

    const opciones = [p.opcion_a, p.opcion_b, p.opcion_c, p.opcion_d];

    opciones.forEach((texto, i) => {
        const letra = ["A", "B", "C", "D"][i];
        const btn = document.createElement("button");
        btn.className = "opcion";
        btn.innerHTML = `${letra}. ${texto}`;

        btn.onclick = () => {
            if (seleccion) return;

            document.querySelectorAll(".opcion").forEach(o => o.classList.remove("selected"));
            btn.classList.add("selected");
            seleccion = letra;
            btnSiguiente.style.display = "block";
        };

        opcionesDiv.appendChild(btn);
    });

    // 9. MathJax
    if (window.MathJax) {
        MathJax.typesetPromise();
    }
}


// =======================
// SIGUIENTE
// =======================
// ✅ DESPUÉS
async function siguiente(){

    if(!seleccion) return

    // 🔒 Bloquear botón para evitar doble clic
    const btn = document.getElementById("btn")
    btn.disabled = true
    btn.innerText = "Cargando..."

    const id = preguntas[index].id_pregunta

    const res = await fetch(`${API}/api/validar/${id}/${seleccion}`)

    const data = await res.json()

    const correcta = preguntas[index].respuesta_correcta

    document.querySelectorAll(".opcion").forEach(btn=>{
        const letra = btn.innerText.charAt(0)
        if(letra===correcta) btn.classList.add("correcta")
        if(letra===seleccion && !data.correcta) btn.classList.add("incorrecta")
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

    // ✅ PRIMERO verificar sesión
    const user = JSON.parse(localStorage.getItem("usuario"))
    if (!user || !user.id_usuario) {
        alert("⚠️ Sesión expirada, inicia sesión de nuevo")
        localStorage.removeItem("usuario")
        location.reload()
        return
    }

    const porcentaje = Math.round((aciertos/preguntas.length)*100)

    if(porcentaje>=70){
        confetti({
            particleCount:150,
            spread:70
        })
    }

    const tiempoFinal = document.getElementById("tiempo").innerText.replace("Tiempo: ","")

    document.getElementById("opciones").style.display = "none"
    document.getElementById("btn").style.display = "none"
    document.getElementById("enunciado").style.display = "none"
    document.getElementById("menu").style.display = "none"

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

    await fetch(`${API}/api/guardar-intento`, {

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

const res = await fetch(`${API}/api/historial/${user.id_usuario}`)
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

const res = await fetch(`${API}/api/ranking`)
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

const res = await fetch(`${API}/api/perfil/${user.id_usuario}`)
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
const correo = document.getElementById("correo-login").value
  const password = document.getElementById("password-login").value

const res = await fetch(`${API}/api/login`, {
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

const nombre = document.getElementById("nombre-registro").value
    const correo = document.getElementById("correo-registro").value
    const password = document.getElementById("password-registro").value

if(!nombre || !correo || !password){
document.getElementById("auth-msg").innerText="Completa todos los campos"
return
}

const res = await fetch(`${API}/api/registro`, {
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
window.onload = () => {
    let user = localStorage.getItem("usuario")
    try { user = JSON.parse(user) } catch { user = null }

    if (user && user.id_usuario) {
        mostrarModulo("inicio")

        // ✅ Mostrar botón admin solo si corresponde
        if (user.es_admin) {
            document.getElementById("btn-admin").style.display = "block"
        }
    } else {
        document.getElementById("auth").style.display = "flex"
    }
}

function cambiarTabAdmin(tab, btn) {
    // Ocultar todos los tabs
    document.querySelectorAll(".tab-content").forEach(tabContent => {
        tabContent.style.display = "none";
    });

    // Mostrar el tab seleccionado
    const activo = document.getElementById(`tab-${tab}`);
    if (!activo) {
        console.error(`No existe el tab: tab-${tab}`);
        return;
    }
    activo.style.display = "block";

    // Quitar clase active a todos los botones
    document.querySelectorAll(".tab-btn").forEach(b => {
        b.classList.remove("active");
    });

    // Marcar el botón actual como activo
    if (btn) {
        btn.classList.add("active");
    }
}

async function guardarNuevaPregunta() {
    const msg = document.getElementById("admin-msg");

    const data = {
        id_area: document.getElementById("adm-area").value,
        id_contexto: document.getElementById("adm-contexto").value || null,
        enunciado: document.getElementById("adm-enunciado").value.trim(),
        opcion_a: document.getElementById("adm-a").value.trim(),
        opcion_b: document.getElementById("adm-b").value.trim(),
        opcion_c: document.getElementById("adm-c").value.trim(),
        opcion_d: document.getElementById("adm-d").value.trim(),
        respuesta_correcta: document.getElementById("adm-correcta").value
    };

    if (
        !data.enunciado ||
        !data.opcion_a ||
        !data.opcion_b ||
        !data.opcion_c ||
        !data.opcion_d
    ) {
        msg.style.color = "red";
        msg.innerText = "⚠️ Completa el enunciado y las 4 opciones";
        return;
    }

    try {
        const res = await fetch(`${API}/api/preguntas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (result.status === "ok") {
            msg.style.color = "green";
            msg.innerText = `✅ Pregunta guardada con ID: ${result.id_pregunta}`;

            document.getElementById("adm-contexto").value = "";
            document.getElementById("adm-enunciado").value = "";
            document.getElementById("adm-a").value = "";
            document.getElementById("adm-b").value = "";
            document.getElementById("adm-c").value = "";
            document.getElementById("adm-d").value = "";
            document.getElementById("adm-correcta").value = "A";
        } else {
            msg.style.color = "red";
            msg.innerText = "❌ Error al guardar la pregunta";
        }
    } catch (error) {
        console.error(error);
        msg.style.color = "red";
        msg.innerText = "❌ Error de conexión con el servidor";
    }
}

async function buscarPreguntaParaEditar() {
    const id = document.getElementById("edit-id-buscar").value;
    const contenedor = document.getElementById("contenedor-edicion");

    if (!id) {
        alert("⚠️ Ingresa un ID");
        return;
    }

    try {
        const res = await fetch(`${API}/api/preguntas/${id}`)
        const data = await res.json();

        if (!data) {
            alert("❌ Pregunta no encontrada");
            return;
        }

        contenedor.style.display = "block";

        document.getElementById("edit-contexto").value = data.id_contexto || "";
        document.getElementById("edit-enunciado").value = data.enunciado || "";
        document.getElementById("edit-a").value = data.opcion_a || "";
        document.getElementById("edit-b").value = data.opcion_b || "";
        document.getElementById("edit-c").value = data.opcion_c || "";
        document.getElementById("edit-d").value = data.opcion_d || "";
        document.getElementById("edit-correcta").value = data.respuesta_correcta || "A";
    } catch (error) {
        console.error(error);
        alert("❌ Error al buscar la pregunta");
    }
}

async function actualizarPregunta() {
    const id = document.getElementById("edit-id-buscar").value;

    if (!id) {
        alert("⚠️ Primero busca una pregunta por ID");
        return;
    }

    const data = {
        id_contexto: document.getElementById("edit-contexto").value || null,
        enunciado: document.getElementById("edit-enunciado").value.trim(),
        opcion_a: document.getElementById("edit-a").value.trim(),
        opcion_b: document.getElementById("edit-b").value.trim(),
        opcion_c: document.getElementById("edit-c").value.trim(),
        opcion_d: document.getElementById("edit-d").value.trim(),
        respuesta_correcta: document.getElementById("edit-correcta").value
    };

    if (
        !data.enunciado ||
        !data.opcion_a ||
        !data.opcion_b ||
        !data.opcion_c ||
        !data.opcion_d
    ) {
        alert("⚠️ Completa todos los campos antes de guardar");
        return;
    }

    try {
       const res = await fetch(`${API}/api/preguntas/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (result.status === "ok") {
            alert("✅ Pregunta actualizada correctamente");
        } else {
            alert("❌ Error al actualizar");
        }
    } catch (error) {
        console.error(error);
        alert("❌ Error de conexión con el servidor");
    }
}

async function eliminarPregunta() {
    const id = document.getElementById("del-id").value;

    if (!id) {
        alert("⚠️ Ingresa un ID");
        return;
    }

    if (!confirm("¿Seguro que quieres eliminar esta pregunta?")) {
        return;
    }

    try {
        const res = await fetch(`${API}/api/preguntas/${id}`, {
            method: "DELETE"
        });

        const result = await res.json();

        if (result.status === "ok") {
            alert("✅ Pregunta eliminada correctamente");
            document.getElementById("del-id").value = "";
        } else {
            alert("❌ Error al eliminar");
        }
    } catch (error) {
        console.error(error);
        alert("❌ Error de conexión con el servidor");
    }
}
// ✅ NUEVA — cambiar entre tabs
function cambiarAuthTab(tab, btn) {
    document.querySelectorAll(".auth-tab").forEach(b => b.classList.remove("active"))
    btn.classList.add("active")
    document.getElementById("form-login").style.display = tab === "login" ? "block" : "none"
    document.getElementById("form-registro").style.display = tab === "registro" ? "block" : "none"
    document.getElementById("auth-msg").innerText = ""
}
// =======================
// CERRAR SESIÓN
// =======================
function cerrarSesion(){
    if(!confirm("¿Seguro que quieres cerrar sesión?")) return
    localStorage.removeItem("usuario")
    location.reload()
}
// =======================
// ZOOM DE IMÁGENES
// =======================
function abrirZoom(src) {
    document.getElementById("zoom-img").src = src
    document.getElementById("zoom-overlay").classList.add("activo")
}

function cerrarZoom() {
    document.getElementById("zoom-overlay").classList.remove("activo")
    document.getElementById("zoom-img").src = ""
}

// Cerrar con tecla ESC
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") cerrarZoom()
})
// =======================
// EDITOR DE IMÁGENES
// =======================
function insertarImagenURL() {
    const enunciado = document.getElementById("adm-enunciado").value.trim()
    if (!enunciado) {
        alert("⚠️ Escribe el enunciado primero antes de insertar una imagen")
        return
    }
    const url = prompt("Pega la URL de la imagen:")
    if (!url) return
    insertarEnCursor(`<div style="text-align:center;margin:16px 0;"><img src="${url}" style="max-width:100%;border-radius:8px;"></div>`)
}

function insertarImagenArchivo() {
    const enunciado = document.getElementById("adm-enunciado").value.trim()
    if (!enunciado) {
        alert("⚠️ Escribe el enunciado primero antes de subir una imagen")
        return
    }
    document.getElementById("input-archivo-img").click()
}

// Subir imagen al servidor y obtener URL
async function subirImagen(input) {
    const archivo = input.files[0]
    if (!archivo) return

    const formData = new FormData()
    formData.append("imagen", archivo)

    try {
        const res = await fetch(`${API}/api/subir-imagen`, {
            method: "POST",
            body: formData
        })
        const data = await res.json()

        if (data.url) {
            insertarEnCursor(`<div style="text-align:center;margin:16px 0;"><img src="${data.url}" style="max-width:100%;border-radius:8px;"></div>`)
        } else {
            alert("❌ Error al subir la imagen")
        }
    } catch (e) {
        console.error(e)
        alert("❌ Error de conexión")
    }

    input.value = ""
}

// Insertar HTML en la posición del cursor del textarea
function insertarEnCursor(html) {
    const textarea = document.getElementById("adm-enunciado")
    const inicio = textarea.selectionStart
    const fin = textarea.selectionEnd
    const texto = textarea.value

    textarea.value = texto.substring(0, inicio) + html + texto.substring(fin)
    textarea.selectionStart = textarea.selectionEnd = inicio + html.length
    textarea.focus()

    // Actualizar preview
    actualizarPreview()
}

// Preview en tiempo real
function actualizarPreview() {
    const texto = document.getElementById("adm-enunciado").value
    const preview = document.getElementById("preview-enunciado")
    if (preview) preview.innerHTML = texto
}