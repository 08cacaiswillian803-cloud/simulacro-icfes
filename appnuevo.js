// =======================
// 👤 USUARIO
// =======================
class Usuario {

constructor(id, nombre, correo){
    this.id = id
    this.nombre = nombre
    this.correo = correo
}

static async login(){

    const correo = document.getElementById("correo").value
    const password = document.getElementById("password").value

    const res = await fetch("/api/login",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({correo,password})
    })

    const data = await res.json()

    if(data.error){
        document.getElementById("auth-msg").innerText="Credenciales incorrectas"
        return null
    }

    const user = new Usuario(data.id_usuario, data.nombre, correo)

    localStorage.setItem("usuario", JSON.stringify(user))

    document.getElementById("auth").style.display="none"

    UI.mostrarModulo("inicio")

    return user
}

static logout(){
    localStorage.removeItem("usuario")
    location.reload()
}

}

// =======================
// 📚 AREA
// =======================
class Area {

constructor(id, nombre){
    this.id = id
    this.nombre = nombre
}

async obtenerPreguntas(){

    const res = await fetch(`/api/preguntas?area=${this.id}`)
    const data = await res.json()

    return data.map(p => new Pregunta(p))
}

}

// =======================
// ❓ PREGUNTA
// =======================
class Pregunta {

constructor(data){
    this.id = data.id_pregunta
    this.enunciado = data.enunciado
    this.imagen = data.url_imagen
    this.opciones = [
        data.opcion_a,
        data.opcion_b,
        data.opcion_c,
        data.opcion_d
    ]
    this.correcta = data.respuesta_correcta
}

mostrar(){

    let html = this.enunciado

    if(this.imagen){
        html += `<img src="${this.imagen}" style="max-width:100%; margin-top:10px; border-radius:10px;">`
    }

    return html
}

verificarRespuesta(respuesta){
    return this.correcta === respuesta
}

}

// =======================
// 🧾 RESPUESTA
// =======================
class Respuesta {

constructor(pregunta, respuestaUsuario, esCorrecta){
    this.pregunta = pregunta
    this.respuestaUsuario = respuestaUsuario
    this.esCorrecta = esCorrecta
}

}

// =======================
// 🎯 INTENTO
// =======================
class Intento {

constructor(usuario, area){
    this.usuario = usuario
    this.area = area
    this.preguntas = []
    this.index = 0
    this.aciertos = 0
    this.respuestas = []
    this.tiempo = 0
    this.intervalo = null
}

async iniciar(){

    this.preguntas = await this.area.obtenerPreguntas()
    this.index = 0
    this.aciertos = 0
    this.respuestas = []

    this.iniciarTiempo()

    this.render()
}

iniciarTiempo(){

    this.tiempo = 0
    clearInterval(this.intervalo)

    this.intervalo = setInterval(()=>{

        this.tiempo++

        const m = Math.floor(this.tiempo/60).toString().padStart(2,"0")
        const s = (this.tiempo%60).toString().padStart(2,"0")

        document.getElementById("tiempo").innerText = `Tiempo: ${m}:${s}`

    },1000)
}

render(){

    const p = this.preguntas[this.index]

    document.getElementById("stats").innerText =
    `Pregunta ${this.index+1} de ${this.preguntas.length}`

    document.getElementById("enunciado").innerHTML = p.mostrar()

    const cont = document.getElementById("opciones")
    cont.innerHTML = ""

    document.getElementById("btn").style.display="none"

    let seleccion = null

    p.opciones.forEach((texto,i)=>{

        const letra = ["A","B","C","D"][i]

        const btn = document.createElement("button")
        btn.className="opcion"
        btn.innerHTML = `${letra}. ${texto}`

        btn.onclick = ()=>{

            document.querySelectorAll(".opcion")
            .forEach(o=>o.classList.remove("selected"))

            btn.classList.add("selected")

            seleccion = letra

            document.getElementById("btn").style.display="block"

            document.getElementById("btn").onclick = ()=>this.siguiente(seleccion)
        }

        cont.appendChild(btn)
    })

    if(window.MathJax){
        MathJax.typesetPromise()
    }
}

siguiente(letra){

    const pregunta = this.preguntas[this.index]

    const esCorrecta = pregunta.verificarRespuesta(letra)

    this.respuestas.push(new Respuesta(pregunta, letra, esCorrecta))

    if(esCorrecta) this.aciertos++

    this.index++

    setTimeout(()=>{
        if(this.index < this.preguntas.length){
            this.render()
        } else {
            this.finalizar()
        }
    },800)
}

async finalizar(){

    clearInterval(this.intervalo)

    const porcentaje = Math.round((this.aciertos / this.preguntas.length)*100)

    const tiempoFinal = document.getElementById("tiempo").innerText.replace("Tiempo: ","")

    document.getElementById("opciones").style.display = "none"
    document.getElementById("btn").style.display = "none"
    document.getElementById("enunciado").style.display = "none"

    document.getElementById("menu").style.display = "block"

    document.getElementById("stats").innerHTML = `
    <h2>Resultado</h2>
    <h1>${this.aciertos}/${this.preguntas.length}</h1>
    <p>${porcentaje}%</p>
    <p>Tiempo total: ${tiempoFinal}</p>

    <button class="btn-final btn-reintentar" onclick="app.reintentar()">
    🔄 Reintentar
    </button>

    <button class="btn-final btn-volver" onclick="UI.mostrarModulo('simulacro')">
    📚 Elegir otra área
    </button>
    `

    await fetch("/api/guardar-intento",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
            puntaje: this.aciertos,
            total: this.preguntas.length,
            id_usuario: this.usuario.id,
            id_area: this.area.id
        })
    })

}

}

// =======================
// 🎨 UI
// =======================
class UI {

static mostrarModulo(modulo){

    document.querySelectorAll(".modulo")
    .forEach(m=>m.style.display="none")

    document.getElementById("mod-"+modulo).style.display="block"

    if(modulo==="historial") app.cargarHistorial()
    if(modulo==="ranking") app.cargarRanking()
    if(modulo==="perfil") app.cargarPerfil()
}

}

// =======================
// 🚀 APP GLOBAL
// =======================
class App {

constructor(){
    this.usuario = null
    this.intento = null
}

async iniciarSimulacro(areaId){

    const area = new Area(areaId, "")

    this.intento = new Intento(this.usuario, area)

    document.getElementById("menu").style.display="none"

    await this.intento.iniciar()
}

reintentar(){
    this.iniciarSimulacro(this.intento.area.id)
}

// =======================
// HISTORIAL
// =======================
async cargarHistorial(){

    const res = await fetch(`/api/historial/${this.usuario.id}`)
    const data = await res.json()

    document.getElementById("lista-historial").innerHTML = JSON.stringify(data)
}

// =======================
// RANKING
// =======================
async cargarRanking(){

    const res = await fetch("/api/ranking")
    const data = await res.json()

    document.getElementById("lista-ranking").innerHTML = JSON.stringify(data)
}

// =======================
// PERFIL
// =======================
async cargarPerfil(){

    const res = await fetch(`/api/perfil/${this.usuario.id}`)
    const data = await res.json()

    document.getElementById("perfil-nombre").innerText = data.nombre
    document.getElementById("perfil-correo").innerText = data.correo
}

}

// =======================
// INSTANCIA GLOBAL
// =======================
const app = new App()

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

if(user && user.id){
    app.usuario = new Usuario(user.id, user.nombre, user.correo)
    UI.mostrarModulo("inicio")
}else{
    document.getElementById("auth").style.display="flex"
}

}