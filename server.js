require('dotenv').config()
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

// ✅ Multer en memoria  👈 AQUÍ
const upload = multer({ storage: multer.memoryStorage() })

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) {
        console.error("❌ Error conectando a MySQL:", err);
        return;
    }
    console.log("✅ Conectado a MySQL");
});


// ============================
// 1. OBTENER PREGUNTAS
// ============================


    app.get('/api/preguntas', (req, res) => {
    let area = parseInt(req.query.area);
    if (!area) area = 1;

    const sql = `
        SELECT 
            p.id_pregunta, 
            p.id_contexto,
            p.enunciado, 
            p.opcion_a, 
            p.opcion_b, 
            p.opcion_c, 
            p.opcion_d, 
            p.respuesta_correcta,
            c.descripcion AS contexto
        FROM preguntas p
        LEFT JOIN contextos c
            ON p.id_contexto = c.id_contexto
        WHERE p.id_area = ? 
        ORDER BY RAND() 
        LIMIT 50
    `;

    db.query(sql, [area], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: "Error en consulta" });
        }
        res.json(results);
    });
});

// ============================
// 2. GUARDAR RESULTADO
// ============================
app.post('/api/guardar-intento', (req, res) => {
    const { puntaje, total, id_usuario, id_area } = req.body;

    const sql = `
        INSERT INTO intentos_simulacro 
        (puntaje_obtenido, total_preguntas, id_usuario, id_area) 
        VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [puntaje, total, id_usuario, id_area], (err, result) => {
        if (err) {
            console.log("Error guardando intento", err);
            return res.status(500).json({ error: "Error guardando intento" });
        }
        res.json({ status: "ok", id_intento: result.insertId });
    });
});

// ============================
// 3. RANKING
// ============================
app.get('/api/ranking', (req, res) => {
    const sql = `
        SELECT 
            u.nombre, 
            MAX(i.puntaje_obtenido) as mejor_puntaje, 
            a.nombre_area
        FROM intentos_simulacro i
        JOIN usuarios u ON i.id_usuario = u.id_usuario
        JOIN areas a ON i.id_area = a.id_area
        GROUP BY u.id_usuario, a.id_area
       ORDER BY mejor_puntaje DESC
        LIMIT 10
    `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ============================
// 4. LOGIN
// ============================
app.post('/api/login', (req, res) => {
    const { correo, password } = req.body;
   const sql = 'SELECT id_usuario, nombre, es_admin FROM usuarios WHERE correo = ? AND password = ?'
    db.query(sql, [correo, password], (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).json({ error: "Credenciales incorrectas" });
        }
        res.json(results[0]);
    });
});

// ============================
// 5. REGISTRO
// ============================
app.post('/api/registro', (req, res) => {

    const { nombre, correo, password } = req.body;

    if (!nombre || !correo || !password) {
        return res.json({ error: "Faltan datos" });
    }

    const checkSql = "SELECT * FROM usuarios WHERE correo = ?";

    db.query(checkSql, [correo], (err, results) => {

        if (err) {
            console.log(err);
            return res.status(500).json({ error: "Error en verificación" });
        }

        if (results.length > 0) {
            return res.json({ error: "El correo ya está registrado" });
        }

        const insertSql = `
            INSERT INTO usuarios (nombre, correo, password)
            VALUES (?, ?, ?)
        `;

        db.query(insertSql, [nombre, correo, password], (err, result) => {

            if (err) {
                console.log("Error insertando usuario:", err);
                return res.status(500).json({ error: "Error registrando usuario" });
            }

            res.json({ status: "ok" });

        });

    });

});

// ============================
// 6. VALIDAR RESPUESTA
// ============================
app.get('/api/validar/:id/:respuesta', (req, res) => {
    const { id, respuesta } = req.params;
    const sql = `SELECT respuesta_correcta FROM preguntas WHERE id_pregunta = ?`;
    db.query(sql, [id], (err, result) => {
        if (err || result.length === 0) return res.status(500).json({ error: "Error" });
        const correcta = result[0].respuesta_correcta.trim().toUpperCase();
        res.json({ correcta: correcta === respuesta.trim().toUpperCase() });
    });
});
// ============================
// 7. HISTORIAL POR USUARIO
// ============================
app.get('/api/historial/:id', (req, res) => {

    const id = req.params.id;

    const sql = `
        SELECT *
        FROM intentos_simulacro
        WHERE id_usuario = ?
        ORDER BY fecha DESC
    `;

    db.query(sql, [id], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: "Error obteniendo historial" });
        }
        res.json(results);
    });

});
// ============================
// 8. PERFIL USUARIO
// ============================
app.get('/api/perfil/:id', (req, res) => {

    const id = req.params.id;

    const sql = `
        SELECT 
            u.nombre,
            u.correo,
            COUNT(i.id_intento) as intentos,
            MAX(i.puntaje_obtenido) as mejor
        FROM usuarios u
        LEFT JOIN intentos_simulacro i 
        ON u.id_usuario = i.id_usuario
        WHERE u.id_usuario = ?
    `;

    db.query(sql, [id], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: "Error obteniendo perfil" });
        }
        res.json(results[0]);
    });

});

app.post("/api/preguntas", (req, res) => {

    const {
        id_area,
        id_contexto,
        enunciado,
        opcion_a,
        opcion_b,
        opcion_c,
        opcion_d,
        respuesta_correcta
    } = req.body;

    const sql = `
        INSERT INTO preguntas 
        (id_area, id_contexto, enunciado, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [
        id_area,
        id_contexto || null,
        enunciado,
        opcion_a,
        opcion_b,
        opcion_c,
        opcion_d,
        respuesta_correcta
    ], (err, result) => {

        if (err) {
            console.error(err);
            return res.json({ status: "error" });
        }

        res.json({ status: "ok", id_pregunta: result.insertId });
    });
});

app.get("/api/preguntas/:id", (req, res) => {

    const id = req.params.id;

    const sql = "SELECT * FROM preguntas WHERE id_pregunta = ?";

    db.query(sql, [id], (err, result) => {

        if (err) {
            console.error(err);
            return res.json(null);
        }

        if (result.length === 0) {
            return res.json(null);
        }

        res.json(result[0]);
    });
});

app.put("/api/preguntas/:id", (req, res) => {

    const id = req.params.id;

    const {
        id_contexto,
        enunciado,
        opcion_a,
        opcion_b,
        opcion_c,
        opcion_d,
        respuesta_correcta
    } = req.body;

    const sql = `
        UPDATE preguntas SET
        id_contexto=?,
        enunciado=?,
        opcion_a=?,
        opcion_b=?,
        opcion_c=?,
        opcion_d=?,
        respuesta_correcta=?
        WHERE id_pregunta=?
    `;

    db.query(sql, [
        id_contexto || null,
        enunciado,
        opcion_a,
        opcion_b,
        opcion_c,
        opcion_d,
        respuesta_correcta,
        id
    ], (err) => {

        if (err) {
            console.error(err);
            return res.json({ status: "error" });
        }

        res.json({ status: "ok" });
    });
});

app.delete("/api/preguntas/:id", (req, res) => {

    const id = req.params.id;

    db.query("DELETE FROM preguntas WHERE id_pregunta = ?", [id], (err) => {

        if (err) {
            console.error(err);
            return res.json({ status: "error" });
        }

        res.json({ status: "ok" });
    });
});

app.get("/api/preguntas/area/:area", (req, res) => {

    const area = req.params.area;

    const sql = `
        SELECT p.*, c.texto AS contexto
        FROM preguntas p
        LEFT JOIN contextos c ON p.id_contexto = c.id_contexto
        WHERE p.id_area = ?
    `;

    db.query(sql, [area], (err, result) => {

        if (err) {
            console.error(err);
            return res.json([]);
        }

        res.json(result);
    });
});
// ✅ Endpoint subir imagen a Cloudinary
app.post('/api/subir-imagen', upload.single('imagen'), async (req, res) => {
    if (!req.file) return res.json({ error: "No se recibió imagen" })

    try {
        const resultado = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                { folder: 'simulacro_icfes' },
                (error, result) => {
                    if (error) reject(error)
                    else resolve(result)
                }
            ).end(req.file.buffer)
        })

        res.json({ url: resultado.secure_url })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Error subiendo imagen" })
    }
})
// ============================
// GUARDAR CONTEXTO
// ============================
app.post('/api/contextos', (req, res) => {
    const { descripcion } = req.body
    if (!descripcion) return res.json({ error: "Falta descripción" })

    const sql = "INSERT INTO contextos (descripcion) VALUES (?)"
    db.query(sql, [descripcion], (err, result) => {
        if (err) {
            console.error(err)
            return res.json({ error: "Error guardando contexto" })
        }
        res.json({ id_contexto: result.insertId })
    })
})
app.listen(3000, () => {
    console.log("🚀 Servidor corriendo en http://localhost:3000");
});