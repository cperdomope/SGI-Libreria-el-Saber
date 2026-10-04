# Tutor CUN IA — Guía de desarrollo paso a paso

> **Para Claude (o cualquier asistente de código):** este archivo es la especificación completa del proyecto. Léelo entero antes de escribir código, respeta las **Reglas de desarrollo** (sección 2) y avanza **una fase a la vez** (sección 9). No pases a la siguiente fase hasta cumplir los criterios de aceptación de la actual.
>
> Documento de origen: [`docs/propuesta-tutor-ia-cun-demo.md`](../docs/propuesta-tutor-ia-cun-demo.md).

---

## 1. Contexto

- **Qué es:** un chatbot web que actúa como **tutor virtual** para estudiantes universitarios. Fortalece el pensamiento crítico: guía con preguntas y pistas, **nunca hace la tarea**, consulta documentos del curso (RAG básico) y busca en Google citando fuentes.
- **Tipo de proyecto:** **demo / proyecto simulado** (no es un sistema institucional real). Usa solo datos ficticios.
- **Equipo:** 5 estudiantes de 4.º semestre: 3 de Ingeniería de Sistemas (poca experiencia en programación) y 2 de Diseño Gráfico.
- **Duración:** 8 semanas.
- **La regla de oro:** *El tutor guía. Nunca hace la tarea.*

---

## 2. Reglas de desarrollo (obligatorias para Claude)

1. **Código para principiantes:** funciones cortas, nombres en español, comentarios en español que expliquen el *porqué*. Nada de clases complejas, decoradores avanzados ni metaprogramación.
2. **Solo el stack definido** (sección 3). No agregar frameworks, ORMs (nada de SQLAlchemy), LangChain ni LlamaIndex.
3. **SQL siempre parametrizado** (`%s`), nunca concatenar strings con datos del usuario.
4. **Secretos fuera de Git:** API keys y credenciales solo en `.streamlit/secrets.toml` (incluido en `.gitignore`). Entregar `secrets.example.toml` con valores vacíos.
5. **Sin datos personales reales.** Datos de prueba ficticios. Recordar que el plan gratuito de Gemini puede usar los datos para mejorar productos de Google.
6. **Los guardrails viven en el System Prompt** (sección 7). Ningún plan de suscripción los desactiva.
7. **Un módulo, una responsabilidad:** `app.py` (interfaz y orquestación), `ia.py` (Gemini), `rag.py` (ChromaDB), `db.py` (MySQL), `prompts.py` (textos del prompt).
8. **Manejo de errores amable:** si falla Gemini, MySQL o ChromaDB, mostrar `st.error("...")` con un mensaje claro en español; no mostrar trazas al usuario.
9. **Commits pequeños** por fase, con mensajes descriptivos en español.
10. Antes de cerrar cada fase: ejecutar la app (`streamlit run app.py`) y verificar los criterios de aceptación.

---

## 3. Stack tecnológico

| Componente | Herramienta | Notas |
|---|---|---|
| Lenguaje | Python 3.11+ | |
| Interfaz web | Streamlit | `st.chat_input`, `st.chat_message`, multipágina con carpeta `pages/` |
| IA (LLM) | Google Gemini vía `google-genai` | Modelo **Flash vigente** (consultar Google AI Studio). Búsqueda con Google integrada (*grounding*) |
| Base vectorial (RAG) | ChromaDB (`PersistentClient`, carpeta local `chroma_db/`) | Embeddings por defecto incluidos (la primera ejecución descarga el modelo; requiere internet) |
| Lectura de PDF | `pypdf` | |
| Base de datos relacional | MySQL 8 en **Railway** (nube) | Cliente: MySQL Workbench. Conector: `mysql-connector-python` |
| Diseño | Figma + `.streamlit/config.toml` | Tema visual definido por el equipo de diseño |
| Despliegue | Streamlit Community Cloud | Secrets configurados en el panel de Streamlit |
| Control de versiones | Git + GitHub (+ GitHub Projects) | Ramas `feature/*`, merge a `main` cada viernes |

`requirements.txt`:
```
streamlit
google-genai
chromadb
pypdf
mysql-connector-python
```

---

## 4. Arquitectura y flujo

```
Estudiante ──► Página web (Streamlit)
                    │
                    ▼
              app.py (orquestador)
               ├─ 1. Login / registro ─────────────► db.py → MySQL en Railway
               ├─ 2. Verificar plan y límite diario ◄─ db.py
               ├─ 3. Leer perfil y temas difíciles  ◄─ db.py
               ├─ 4. Buscar 3 trozos relevantes     ◄─ rag.py → ChromaDB
               ├─ 5. Armar prompt y llamar a la IA  ──► ia.py → Gemini (+ Google Search)
               ├─ 6. Separar línea TEMA | TIPO y extraer fuentes
               ├─ 7. Guardar pregunta, respuesta, tema ─► db.py → MySQL
               └─ 8. Mostrar respuesta + fuentes en el chat
```

**Separación de responsabilidades:** MySQL guarda datos estructurados (usuarios, historial, progreso, planes). ChromaDB guarda solo los trozos de documentos para buscar por significado.

### 4.1 Lógica de `app.py` por cada mensaje (pseudocódigo)
```
si no hay estudiante en st.session_state → mostrar login/registro y detener
plan = db.plan_actual(id_estudiante)
si plan.limite_diario no es None y db.mensajes_hoy(id_estudiante) >= plan.limite_diario:
    mostrar aviso + enlace a página de planes y detener
pregunta = st.chat_input(...)
db.guardar_mensaje(id_sesion, "estudiante", pregunta)
perfil   = db.obtener_perfil(id_estudiante)
trozos   = rag.buscar(pregunta, n=3)            # lista de {texto, fuente, pagina}
prompt   = prompts.armar_system_prompt(perfil, trozos, modo)   # modo: "tutor" o "escritos" (solo si el plan lo permite)
texto, fuentes_web = ia.preguntar(prompt, historial_reciente, pregunta)
respuesta, tema, tipo = separar_control(texto)  # quita la última línea "TEMA: ... | TIPO: ..."
fuentes = fuentes de trozos + fuentes_web
db.guardar_mensaje(id_sesion, "tutor", respuesta, fuentes, tipo)
si tipo == "academica": db.registrar_tema_dificil(id_estudiante, tema)
mostrar respuesta y fuentes; botones 👍/👎 → db.guardar_valoracion(...)
```

---

## 5. Estructura de carpetas

```
tutor-cun-ia/
├── README.md                 # esta guía
├── app.py                    # interfaz de chat + orquestación (login, chat, límites)
├── ia.py                     # conexión y llamada a Gemini
├── rag.py                    # cargar PDFs, dividir, indexar y buscar en ChromaDB
├── db.py                     # conexión y funciones CRUD de MySQL
├── prompts.py                # System Prompt y armado del contexto
├── indexar.py                # script: python indexar.py → indexa documentos/
├── pages/
│   ├── 1_Planes.py           # página de planes (freemium simulado)
│   └── 2_Panel_docente.py    # estadísticas (solo rol docente)
├── sql/
│   ├── schema.sql            # tablas
│   └── datos_prueba.sql      # planes, estudiantes y temas ficticios
├── documentos/               # PDFs/TXT de la base de conocimiento
├── chroma_db/                # generado por indexar.py (en .gitignore)
├── pruebas/
│   └── preguntas_prueba.csv  # 30 preguntas de evaluación
├── requirements.txt
├── .gitignore                # .streamlit/secrets.toml, chroma_db/, __pycache__/, .venv/
└── .streamlit/
    ├── config.toml           # tema visual (colores, fuente)
    ├── secrets.toml          # NO se sube a GitHub
    └── secrets.example.toml  # plantilla sin valores
```

---

## 6. Configuración

### 6.1 `.streamlit/secrets.example.toml`
```toml
GEMINI_API_KEY = ""
GEMINI_MODEL   = ""            # modelo Flash vigente, ej. el que indique Google AI Studio
MYSQL_HOST     = ""            # host público de Railway (….proxy.rlwy.net)
MYSQL_PORT     = ""
MYSQL_USER     = ""
MYSQL_PASSWORD = ""
MYSQL_DB       = "tutor_cun"   # o "railway" si se usa la base por defecto
```

### 6.2 Railway (MySQL en la nube)
1. Crear proyecto en Railway → *New* → *Database* → *MySQL*.
2. En *Variables / Connect* copiar host público, puerto, usuario y contraseña.
3. Conectar MySQL Workbench con esos datos y ejecutar `sql/schema.sql` y luego `sql/datos_prueba.sql`.
4. Railway crea por defecto la base `railway`: se puede usar (cambiar `MYSQL_DB` y omitir `CREATE DATABASE`) o crear `tutor_cun`.
5. Railway funciona con créditos: revisar el plan vigente y **apagar el servicio al terminar el proyecto**.

### 6.3 Gemini
1. Crear API key gratis en Google AI Studio.
2. Elegir el modelo Flash vigente y ponerlo en `GEMINI_MODEL`.

---

## 7. System Prompt (`prompts.py`)

Usar este texto como plantilla; `{perfil}` y `{contexto}` se reemplazan en tiempo de ejecución.

```text
Eres "Tutor CUN", un tutor virtual para estudiantes universitarios. Tu objetivo es ayudarles a PENSAR, no hacer el trabajo por ellos.

DATOS DEL ESTUDIANTE:
{perfil}
Adapta tus ejemplos a su carrera y refuerza con paciencia los temas que le cuestan.

TONO:
- Español claro, amable y motivador. Trata al estudiante de "tú".
- Respuestas cortas (máximo 150 palabras), salvo que pida más detalle.
- Termina casi siempre con una pregunta que lo haga reflexionar.

CÓMO ENSEÑAS:
1. Primero pregunta qué sabe o qué ha intentado.
2. Da pistas en niveles:
   - Pista 1: una pregunta orientadora.
   - Pista 2: el concepto clave con un ejemplo diferente al ejercicio.
   - Pista 3: solo el primer paso.
3. Pide que explique con sus palabras lo que entendió.
4. Si analiza un argumento, ayúdale a encontrar premisas, evidencias y posibles falacias.

LO QUE NUNCA HACES:
- No escribes ensayos, tareas, informes ni código completo de una entrega.
- No resuelves exámenes ni quices.
- No reescribes ni parafraseas textos para evitar el plagio.
Si te lo piden, responde con amabilidad que tu función es guiar y ofrece ayudar paso a paso.

USO DE FUENTES:
- Usa primero la información de los documentos del curso:
{contexto}
- Si no es suficiente, usa la búsqueda web y prefiere fuentes confiables (universidades, revistas académicas, sitios .edu y .gov).
- Indica siempre la fuente: [Fuente: nombre del documento o enlace].
- Nunca inventes datos, autores ni enlaces.

CUANDO NO SABES:
- Di claramente: "No tengo información confiable sobre eso".
- Sugiere dónde buscar (biblioteca, docente, base de datos académica).
- Si la pregunta no es clara, pide que la explique mejor.

FUERA DE TEMA:
- Si la pregunta no es académica, responde brevemente y redirige: "Soy un tutor académico, ¿en qué tema de estudio te ayudo?".
- No das consejos médicos, legales ni financieros. No opinas de política ni religión.
- Si el estudiante expresa una crisis emocional, responde con empatía y recomiéndale buscar ayuda en Bienestar Universitario o la Línea 106.

FORMATO DE CONTROL (para guardar en la base de datos):
Al final de CADA respuesta agrega una última línea exactamente así:
TEMA: <tema principal en máximo 4 palabras> | TIPO: <academica | fuera_alcance | hazlo_por_mi>
```

**Modo "retroalimentación de escritos"** (solo planes con `retroalimentacion_escritos = TRUE`): agregar al prompt:
```text
MODO RETROALIMENTACIÓN DE ESCRITOS:
El estudiante compartirá un texto propio. Evalúalo con la rúbrica de los documentos del curso: estructura, tesis, evidencia y citas APA.
Da comentarios y preguntas por cada criterio. NO reescribas el texto ni entregues una versión corregida.
```

---

## 8. Modelo de datos (`sql/schema.sql`)

```sql
CREATE DATABASE IF NOT EXISTS tutor_cun CHARACTER SET utf8mb4;
USE tutor_cun;

CREATE TABLE estudiantes (
  id_estudiante  INT AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL,
  correo         VARCHAR(120) NOT NULL UNIQUE,
  carrera        VARCHAR(80)  NOT NULL,
  semestre       TINYINT      NOT NULL,
  rol            ENUM('estudiante','docente') DEFAULT 'estudiante',
  fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE temas (
  id_tema    INT AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL UNIQUE,
  asignatura VARCHAR(80)  NOT NULL
);

CREATE TABLE temas_dificiles (
  id_estudiante    INT NOT NULL,
  id_tema          INT NOT NULL,
  veces_consultado INT DEFAULT 1,
  ultima_consulta  DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_estudiante, id_tema),
  FOREIGN KEY (id_estudiante) REFERENCES estudiantes(id_estudiante),
  FOREIGN KEY (id_tema)       REFERENCES temas(id_tema)
);

CREATE TABLE sesiones (
  id_sesion     INT AUTO_INCREMENT PRIMARY KEY,
  id_estudiante INT NOT NULL,
  inicio        DATETIME DEFAULT CURRENT_TIMESTAMP,
  fin           DATETIME NULL,
  FOREIGN KEY (id_estudiante) REFERENCES estudiantes(id_estudiante)
);

CREATE TABLE mensajes (
  id_mensaje INT AUTO_INCREMENT PRIMARY KEY,
  id_sesion  INT NOT NULL,
  rol        ENUM('estudiante','tutor') NOT NULL,
  contenido  TEXT NOT NULL,
  fuentes    VARCHAR(500) NULL,
  tipo       ENUM('academica','fuera_alcance','hazlo_por_mi') DEFAULT 'academica',
  fecha      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_sesion) REFERENCES sesiones(id_sesion)
);

CREATE TABLE valoraciones (
  id_valoracion INT AUTO_INCREMENT PRIMARY KEY,
  id_mensaje    INT NOT NULL UNIQUE,
  util          BOOLEAN NOT NULL,
  comentario    VARCHAR(255) NULL,
  FOREIGN KEY (id_mensaje) REFERENCES mensajes(id_mensaje)
);

-- Modelo de negocio simulado (sin pagos reales)
CREATE TABLE planes (
  id_plan                    INT AUTO_INCREMENT PRIMARY KEY,
  nombre                     VARCHAR(40) NOT NULL UNIQUE,
  limite_diario              INT NULL,              -- NULL = ilimitado
  retroalimentacion_escritos BOOLEAN DEFAULT FALSE,
  precio_mensual             DECIMAL(10,2) DEFAULT 0 -- valor ficticio
);

CREATE TABLE suscripciones (
  id_suscripcion INT AUTO_INCREMENT PRIMARY KEY,
  id_estudiante  INT NOT NULL,
  id_plan        INT NOT NULL,
  fecha_inicio   DATE NOT NULL,
  fecha_fin      DATE NULL,
  estado         ENUM('activa','vencida','cancelada') DEFAULT 'activa',
  FOREIGN KEY (id_estudiante) REFERENCES estudiantes(id_estudiante),
  FOREIGN KEY (id_plan)       REFERENCES planes(id_plan)
);
```

`sql/datos_prueba.sql` debe incluir como mínimo:
```sql
INSERT INTO planes (nombre, limite_diario, retroalimentacion_escritos, precio_mensual) VALUES
  ('Prueba',        NULL, TRUE,  0),
  ('Gratuito',      10,   FALSE, 0),
  ('Premium',       NULL, TRUE,  0),   -- precio ficticio por definir
  ('Institucional', NULL, TRUE,  0);
-- + 10 estudiantes ficticios (al menos 1 docente) y 15 temas de la asignatura piloto
```

### 8.1 Funciones de `db.py`
| Función | SQL | Uso |
|---|---|---|
| `conectar()` | — | Conexión con `st.secrets` |
| `registrar_estudiante(nombre, correo, carrera, semestre)` | `INSERT` | Registro (luego llamar `asignar_prueba`) |
| `buscar_estudiante(correo)` | `SELECT … WHERE correo = %s` | Login simple (sin contraseña: es demo) |
| `crear_sesion(id_estudiante)` / `cerrar_sesion(id_sesion)` | `INSERT` / `UPDATE` | Inicio y fin del chat |
| `guardar_mensaje(id_sesion, rol, contenido, fuentes=None, tipo='academica')` | `INSERT` | Cada pregunta y respuesta; devuelve `id_mensaje` |
| `guardar_valoracion(id_mensaje, util)` | `INSERT` | Botones 👍/👎 |
| `registrar_tema_dificil(id_estudiante, nombre_tema)` | `INSERT … ON DUPLICATE KEY UPDATE veces_consultado = veces_consultado + 1` | Crear el tema si no existe (asignatura "General") |
| `obtener_perfil(id_estudiante)` | `SELECT` + `JOIN` temas_dificiles/temas (top 3) | Texto para `{perfil}` |
| `eliminar_historial(id_estudiante)` | `DELETE` (valoraciones → mensajes → sesiones) | Derecho a borrar datos |
| `asignar_prueba(id_estudiante)` | `INSERT` con `fecha_fin = CURDATE() + INTERVAL 14 DAY` | Al registrarse |
| `plan_actual(id_estudiante)` | `SELECT` + `JOIN planes` (activa y no vencida; si la prueba venció → marcar `vencida` y asignar Gratuito) | Antes de cada pregunta |
| `mensajes_hoy(id_estudiante)` | `SELECT COUNT(*)` (rol estudiante, `DATE(fecha) = CURDATE()`) | Límite diario |
| `activar_plan(id_estudiante, nombre_plan)` | `UPDATE` (cancelar actual) + `INSERT` | Botón "Activar Premium (simulado)" |
| Consultas del panel | `GROUP BY`, `SUM`, `AVG`, `COUNT` | Página Panel docente |

Patrón de referencia:
```python
def guardar_mensaje(conn, id_sesion, rol, contenido, fuentes=None, tipo="academica"):
    sql = ("INSERT INTO mensajes (id_sesion, rol, contenido, fuentes, tipo) "
           "VALUES (%s, %s, %s, %s, %s)")
    cur = conn.cursor()
    cur.execute(sql, (id_sesion, rol, contenido, fuentes, tipo))
    conn.commit()
    id_mensaje = cur.lastrowid
    cur.close()
    return id_mensaje
```

---

## 9. Paso a paso de desarrollo (fases)

Cada fase indica **responsable** (S1–S3 Sistemas, D1–D2 Diseño), **tareas para Claude**, y **criterios de aceptación**.

### Fase 0 — Preparación (semana 1)
**Responsables:** todos · S1 repo · S3 Railway
- Crear la estructura de carpetas (sección 5), `requirements.txt`, `.gitignore`, `secrets.example.toml`.
- `app.py` mínimo: título "Tutor CUN" y un texto de bienvenida.
- **Aceptación:** `pip install -r requirements.txt` y `streamlit run app.py` muestran la página; `secrets.toml` no aparece en `git status`.

### Fase 1 — Primer chat con Gemini (semana 2)
**Responsable:** S1
- `ia.py`: cliente Gemini con `st.secrets`; función `preguntar(system_prompt, historial, pregunta)` que devuelve `(texto, fuentes_web)`.
- `prompts.py`: System Prompt de la sección 7 (sin `{contexto}` aún).
- `app.py`: chat con `st.chat_input` / `st.chat_message` y historial en `st.session_state`.
- **Aceptación:** el bot conversa en español, da pistas en lugar de soluciones y responde a "hazme el ensayo" con la política de integridad.

Referencia de llamada:
```python
from google import genai
from google.genai import types
import streamlit as st

client = genai.Client(api_key=st.secrets["GEMINI_API_KEY"])

def preguntar(system_prompt, pregunta):
    respuesta = client.models.generate_content(
        model=st.secrets["GEMINI_MODEL"],
        contents=pregunta,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            tools=[types.Tool(google_search=types.GoogleSearch())],
        ),
    )
    return respuesta.text
```
> Las fuentes web del *grounding* se leen de `respuesta.candidates[0].grounding_metadata` (lista de `grounding_chunks` con `web.uri` y `web.title`). Validar contra la documentación vigente de `google-genai`.

### Fase 2 — Base de datos en Railway (semana 2–3)
**Responsable:** S3
- Escribir `sql/schema.sql` y `sql/datos_prueba.sql`; ejecutarlos en Railway desde Workbench.
- `db.py`: `conectar`, `registrar_estudiante`, `buscar_estudiante`.
- **Aceptación:** las 8 tablas existen; los datos de prueba se consultan con `SELECT` desde Workbench.

### Fase 3 — Datos de la base de conocimiento (semana 3)
**Responsables:** S2 + D2 (contenido) · D1 (mockups en Figma)
- Reunir 5–15 documentos en `documentos/`: guías de una asignatura piloto, rúbrica de ensayo, guía APA 7, catálogo de falacias, banco de preguntas guía, errores frecuentes, FAQ ficticia, 2 ensayos de ejemplo comentados.
- **Aceptación:** `pypdf` extrae texto legible de todos los archivos.

### Fase 4 — RAG con ChromaDB (semana 4)
**Responsables:** S2 (`rag.py`) · S1 (integración) · S3 (login) · D1 (tema visual)
- `rag.py`:
  - `leer_documentos(carpeta)` → lista de `{texto, fuente, pagina}` por página.
  - `dividir(texto, tamano=800, solape=100)` → trozos.
  - `indexar()` → `chromadb.PersistentClient(path="chroma_db")`, colección `documentos`, `collection.add(ids, documents, metadatas)`.
  - `buscar(pregunta, n=3)` → `collection.query(query_texts=[pregunta], n_results=n)`.
- `indexar.py`: ejecuta `rag.indexar()` e imprime cuántos trozos guardó.
- `prompts.armar_system_prompt(perfil, trozos, modo)` rellena `{contexto}` con los trozos y su fuente.
- Pantalla de registro/login conectada a MySQL. Al registrarse, `asignar_prueba`.
- `.streamlit/config.toml` con el tema de D1.
- **Aceptación:** una pregunta sobre la asignatura piloto se responde citando `[Fuente: archivo.pdf, p. N]`; el login funciona.

### Fase 5 — Búsqueda web y guardrails (semana 5)
**Responsables:** S1 · S2 (preguntas de prueba) · S3 (sesiones/mensajes) · D1/D2 (mensajes de la interfaz)
- Mostrar bajo cada respuesta las fuentes (documentos + enlaces web).
- `db.py`: `crear_sesion`, `guardar_mensaje`, `cerrar_sesion`.
- Separar y ocultar la línea `TEMA: … | TIPO: …` (si falta, usar `tema="General"`, `tipo="academica"`).
- Crear `pruebas/preguntas_prueba.csv` (10 normales, 10 fuera de alcance, 10 "hazlo por mí").
- **Aceptación:** respuestas con enlaces citados; cada conversación queda registrada en MySQL; la línea de control nunca se ve en pantalla.

### Fase 6 — Personalización, planes y panel (semana 6)
**Responsables:** S1 (lógica) · S3 (SQL) · D1 (diseño panel y planes) · D2 (textos y redes)
- `registrar_tema_dificil`, `obtener_perfil` → inyectar en `{perfil}`.
- Planes: `plan_actual`, `mensajes_hoy`, `activar_plan`; bloquear al superar el límite y enlazar a `pages/1_Planes.py`.
- `pages/1_Planes.py`: tarjetas Prueba / Gratuito / Premium / Institucional y botón "Activar Premium (simulado)". Aviso visible: *"Simulación: no se realiza ningún cobro."*
- Modo "retroalimentación de escritos" (selector en la barra lateral) solo si el plan lo permite.
- Botones 👍/👎 → `guardar_valoracion`; botón "Borrar mi historial" → `eliminar_historial`.
- `pages/2_Panel_docente.py` (solo `rol = 'docente'`): temas más difíciles, mensajes por carrera, % respuestas útiles, intentos "hazlo por mí", usuarios e ingresos simulados por plan, con `st.bar_chart` / `st.metric`.
- **Aceptación:** el bot menciona los temas difíciles del estudiante; el plan Gratuito bloquea el mensaje 11 del día; el panel muestra datos reales de la BD y no es accesible para estudiantes.

### Fase 7 — Evaluación (semana 7)
**Responsables:** S2 (informe) · S3 (pruebas BD) · D1 (usabilidad) · S1 (correcciones)
- Ejecutar las 30 preguntas y registrar ✔/✘ en el CSV.
- Metas: ≥ 80 % respuestas correctas con fuente · **100 %** sin entregar tareas resueltas · ≥ 90 % fuera de alcance bien redirigidas.
- Pruebas de BD: llaves foráneas, consultas del panel vs. datos, respaldo con `mysqldump`.
- Prueba de usabilidad con 5 compañeros (encuesta 1–5).
- **Aceptación:** metas cumplidas o ajustes al System Prompt documentados.

### Fase 8 — Despliegue y cierre (semana 8)
**Responsables:** S1 (deploy) · S3 (documentación BD) · D1/D2 (presentación y video)
- Publicar en Streamlit Community Cloud y configurar Secrets.
- Completar este README con: instalación, capturas, diagrama E-R, diccionario de datos e informe de pruebas.
- **Aceptación:** URL pública funcionando conectada a Railway; demo en vivo ensayada.

> **Nota de despliegue:** `chroma_db/` está en `.gitignore`; en Streamlit Cloud ejecutar la indexación al iniciar si la colección está vacía. Si ChromaDB falla por la versión de SQLite del servidor, usar el arreglo documentado por ChromaDB (`pysqlite3-binary`).

---

## 10. Modelo de negocio (freemium simulado)

| Plan | Límite | Retroalimentación de escritos | Precio |
|---|---|---|---|
| Prueba (14 días al registrarse) | Ilimitado | Sí | Gratis |
| Gratuito | 10 mensajes/día | No | Gratis |
| Premium | Ilimitado | Sí | [$__ COP/mes] (ficticio) |
| Institucional | Ilimitado | Sí + panel docente | Por convenio |

- **No hay pagos reales.** Activar un plan = registro en `suscripciones`.
- **Regla ética:** ningún plan desactiva los guardrails. Premium da más uso, nunca respuestas resueltas.
- Segmentos de la demo: estudiantes universitarios (principal) y docentes (panel).

---

## 11. Equipo y responsabilidades

| Código | Rol | Archivos / entregables |
|---|---|---|
| S1 | Líder técnico / IA | `app.py`, `ia.py`, `prompts.py`, integración, despliegue |
| S2 | RAG y pruebas | `rag.py`, `indexar.py`, `documentos/`, `pruebas/`, informe de evaluación |
| S3 | Base de datos | `sql/`, `db.py`, `pages/2_Panel_docente.py`, diagrama E-R y diccionario de datos |
| D1 | UX/UI e identidad | Mockups Figma, `config.toml`, diseño de planes y panel, prueba de usabilidad |
| D2 | Contenidos y comunicación | Documentos de conocimiento, textos de planes, manual de usuario, redes, video |

**Flujo Git:** cada integrante en su rama (`feature/chat`, `feature/rag`, `feature/mysql`, `feature/diseno`); S1 revisa y une a `main` cada viernes.

---

## 12. Definición de "terminado"

- [ ] Los 4 casos de uso funcionan: tutor con pistas, preguntas del curso con fuentes, búsqueda web con enlaces, personalización con MySQL.
- [ ] Planes simulados con límite diario y página de planes.
- [ ] Panel docente con consultas SQL reales.
- [ ] Ningún secreto en el repositorio; solo datos ficticios.
- [ ] Informe de las 30 preguntas con métricas.
- [ ] App publicada en Streamlit Cloud y conectada a Railway.
- [ ] README completo con instalación y documentación de la BD.
