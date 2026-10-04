# Propuesta Técnica (versión Demo) — "Tutor CUN IA"

## Contexto
Proyecto **simulado / Demo** para estudiantes de **4.º semestre de Ingeniería de Sistemas con poca experiencia en programación**. Objetivo: construir en ~8 semanas un chatbot tutor que guíe con preguntas (no hace las tareas), consulte unos pocos documentos propios (RAG básico) y busque en la web con fuentes citadas. Se prioriza: **pocas herramientas, todo en Python, gratis o casi gratis, ejecutable en un portátil**, e incluye **MySQL** como base de datos relacional para demostrar diseño E-R, SQL y CRUD. Equipo: 3 estudiantes de Ingeniería de Sistemas y 2 de Diseño Gráfico (ver sección 6).

---

## 1. Alcance y Casos de Uso (Demo)

### 1.1 Cuatro casos de uso priorizados
| # | Caso de uso | Qué hace en la demo | Dificultad |
|---|---|---|---|
| 1 | **Tutor con pistas** | El estudiante pega un ejercicio; el bot responde con preguntas guía y pistas en 3 niveles. Nunca da la solución completa. | Baja (solo prompt) |
| 2 | **Preguntas sobre material del curso** | Responde usando 5–10 PDFs cargados (guías, apuntes) y dice de qué documento sacó la respuesta. | Media (RAG básico) |
| 3 | **Búsqueda web con fuentes** | Si el tema no está en los PDFs, busca en internet y muestra los enlaces usados. | Baja (herramienta del LLM) |
| 4 | **Personalización con MySQL** | Registra al estudiante (nombre, carrera, semestre), guarda el historial de conversaciones y los temas difíciles en **MySQL**; el bot los recuerda en la siguiente sesión y un panel muestra estadísticas. | Media (SQL básico) |

### 1.2 Guardrails (reglas de comportamiento)
- **Sí responde:** dudas de las materias, explicación de conceptos, cómo citar en APA, cómo mejorar un argumento, recomendaciones de estudio.
- **No hace:** escribir ensayos o tareas completas, resolver exámenes, dar código completo de una entrega, temas médicos/legales/personales, política o religión.
- **Fuera de alcance:** responde breve y amable ("Soy un tutor académico, ¿en qué tema de estudio te ayudo?").
- **"Hazlo por mí":** explica la regla de integridad académica y ofrece guiar paso a paso.
- **Implementación:** todo esto vive en el **System Prompt** (sección 5). Para la demo no se necesitan clasificadores ni modelos extra.

### 1.3 Modelo de negocio simulado (freemium)
Para alinear la demo con el Modelo Canvas (sección 7) se simulan planes y suscripciones. **No hay pagos reales**: activar un plan es solo un registro en MySQL.

| Plan | Para quién | Qué incluye | Precio (ficticio) |
|---|---|---|---|
| **Prueba** | Todo usuario nuevo | 14 días con todas las funciones | Gratis |
| **Gratuito** | Al terminar la prueba | 10 mensajes por día; tutor con pistas y búsqueda con fuentes | Gratis |
| **Premium estudiante** | Estudiantes | Mensajes ilimitados + **retroalimentación de escritos con rúbrica** + historial completo | [$__ COP/mes] |
| **Institucional** | Universidades / docentes | Acceso para sus estudiantes + panel de estadísticas para el docente | [Por convenio] |

- **Regla ética:** ningún plan elimina los guardrails. Premium da más uso y funciones, **nunca** respuestas resueltas.
- **En la app:** al registrarse se asigna el plan *Prueba*; antes de cada pregunta `app.py` revisa el plan y cuántos mensajes lleva hoy; si llega al límite muestra la página de planes con un botón "Activar Premium (simulado)".
- **Retroalimentación de escritos:** el estudiante pega su texto y el tutor lo evalúa contra la rúbrica de la base de conocimiento, con comentarios y preguntas, sin reescribirlo.

---

## 2. Datos y Base de Conocimiento (RAG básico)

### 2.1 Qué documentos recolectar (pequeño y controlado: 5–15 archivos)
- Guías de una asignatura (ej. Programación I o Lógica).
- **Rúbrica** de evaluación de un ensayo.
- Guía corta de **normas APA 7**.
- Lista de **falacias y tipos de argumentos** (para pensamiento crítico).
- **Banco de preguntas guía** por tema (lo escriben los mismos estudiantes: excelente ejercicio).
- **Errores frecuentes** de los estudiantes y cómo detectarlos.
- FAQ ficticia de la universidad (horarios, biblioteca) — datos simulados.
- Ejemplos de ensayos **inventados** (uno bueno y uno malo) con comentarios.

> Usar solo material propio, público o inventado. Nada de datos reales de estudiantes.

### 2.2 Procesamiento (explicado sencillo)
1. **Cargar:** los PDF/TXT se ponen en una carpeta `documentos/`.
2. **Dividir (chunking):** cortar cada documento en trozos de ~800 caracteres con 100 de solapamiento (para no partir ideas a la mitad).
3. **Vectorizar:** convertir cada trozo en números (embedding) para poder buscar por significado. **ChromaDB lo hace automáticamente** con un modelo incluido, sin configurar nada.
4. **Guardar:** Chroma guarda todo en una carpeta local (`chroma_db/`).
5. **Consultar:** ante cada pregunta se traen los 3 trozos más parecidos y se le pasan al LLM junto con la pregunta.
6. **Metadatos mínimos:** nombre del archivo y página, para poder citar la fuente.

---

## 3. Arquitectura y Stack (simple)

```
Estudiante ──► Página web (Streamlit)
                    │
                    ▼
              app.py (Python)
               ├─ Login / registro ──────────► MySQL (estudiantes)
               ├─ Lee perfil y temas difíciles ◄─ MySQL (temas_dificiles)
               ├─ Busca trozos en ChromaDB (documentos/)
               ├─ Llama a la API de Claude
               │    ├─ System Prompt (reglas del tutor)
               │    └─ Herramienta de búsqueda web integrada
               └─ Guarda pregunta, respuesta y fuentes ─► MySQL (sesiones, mensajes)
```

> **Separación de responsabilidades:** **MySQL** guarda los datos estructurados (usuarios, historial, progreso, calificaciones). **ChromaDB** guarda solo los trozos de documentos para la búsqueda por significado. Así se demuestra el manejo de MySQL sin complicar el RAG.

| Componente | Elección | Por qué para principiantes |
|---|---|---|
| Lenguaje | **Python** | Sintaxis sencilla, mucha documentación en español |
| Interfaz | **Streamlit** (`st.chat_input`, `st.chat_message`) | Un chat web en ~30 líneas, sin HTML/JS |
| LLM | **Claude Haiku 4.5** vía API (`anthropic` SDK) | Barato (la demo cuesta pocos dólares), buen español, trae **búsqueda web incorporada** (no hay que programar el buscador) |
| Base vectorial | **ChromaDB** (modo local) | `pip install chromadb`, sin servidor, embeddings incluidos |
| Lectura de PDF | `pypdf` | Una función para extraer texto |
| Base de datos relacional | **MySQL 8** + **MySQL Workbench** (o XAMPP) | Estándar en la industria; se diseña el modelo E-R y se practica SQL (CRUD, JOIN, GROUP BY) |
| Conector | `mysql-connector-python` | Consultas parametrizadas (`%s`) para evitar inyección SQL |
| Despliegue | Demo **local** (Streamlit + MySQL en el portátil). Opcional: Streamlit Community Cloud + MySQL gratuito en la nube (Aiven/Railway free tier) | Local es lo más simple para la sustentación; credenciales en `secrets.toml` |

**Alternativa sin código (si el equipo se atasca):** **Flowise** o **Dify** (arrastrar y soltar bloques: PDF → Chroma → LLM → chat). Útil para mostrar el concepto en 1 semana.

**Estructura del proyecto:**
```
tutor-cun-demo/
├── app.py              # interfaz de chat + lógica principal
├── rag.py              # cargar PDFs, dividir, guardar y buscar en Chroma
├── prompts.py          # System Prompt
├── db.py               # conexión y funciones CRUD de MySQL
├── sql/
│   ├── schema.sql      # creación de BD y tablas
│   └── datos_prueba.sql# estudiantes y temas ficticios
├── pages/
│   └── panel.py        # panel de estadísticas (consultas SQL)
├── documentos/         # PDFs de la base de conocimiento
├── requirements.txt    # streamlit, anthropic, chromadb, pypdf, mysql-connector-python
└── .streamlit/secrets.toml   # API key y credenciales MySQL (no subir a GitHub)
```

### 3.1 Modelo de datos MySQL

**Entidades y relaciones (E-R):**
- `estudiantes` 1 ── N `sesiones` 1 ── N `mensajes`
- `estudiantes` N ── N `temas` (tabla intermedia `temas_dificiles`)
- `mensajes` 1 ── 0..1 `valoraciones` (👍/👎 del estudiante)
- `planes` 1 ── N `suscripciones` N ── 1 `estudiantes` (modelo de negocio simulado)

**`sql/schema.sql`:**
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
  id_estudiante INT NOT NULL,
  id_tema       INT NOT NULL,
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
  id_mensaje  INT AUTO_INCREMENT PRIMARY KEY,
  id_sesion   INT NOT NULL,
  rol         ENUM('estudiante','tutor') NOT NULL,
  contenido   TEXT NOT NULL,
  fuentes     VARCHAR(500) NULL,           -- documento o enlace citado
  tipo        ENUM('academica','fuera_alcance','hazlo_por_mi') DEFAULT 'academica',
  fecha       DATETIME DEFAULT CURRENT_TIMESTAMP,
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
  id_plan          INT AUTO_INCREMENT PRIMARY KEY,
  nombre           VARCHAR(40)  NOT NULL UNIQUE,   -- Prueba, Gratuito, Premium, Institucional
  limite_diario    INT NULL,                       -- NULL = ilimitado
  retroalimentacion_escritos BOOLEAN DEFAULT FALSE,
  precio_mensual   DECIMAL(10,2) DEFAULT 0         -- valor ficticio
);

CREATE TABLE suscripciones (
  id_suscripcion INT AUTO_INCREMENT PRIMARY KEY,
  id_estudiante  INT NOT NULL,
  id_plan        INT NOT NULL,
  fecha_inicio   DATE NOT NULL,
  fecha_fin      DATE NULL,                       -- Prueba: inicio + 14 días
  estado         ENUM('activa','vencida','cancelada') DEFAULT 'activa',
  FOREIGN KEY (id_estudiante) REFERENCES estudiantes(id_estudiante),
  FOREIGN KEY (id_plan)       REFERENCES planes(id_plan)
);
```

**Funciones en `db.py` (CRUD que se demuestra):**
| Función | SQL | Uso en la app |
|---|---|---|
| `registrar_estudiante()` | `INSERT` | Formulario de registro |
| `buscar_estudiante(correo)` | `SELECT ... WHERE` | Login simple |
| `crear_sesion()` / `cerrar_sesion()` | `INSERT` / `UPDATE` | Inicio y fin del chat |
| `guardar_mensaje()` | `INSERT` | Cada pregunta y respuesta |
| `registrar_tema_dificil()` | `INSERT ... ON DUPLICATE KEY UPDATE veces_consultado = veces_consultado + 1` | Personalización |
| `obtener_perfil()` | `SELECT` con `JOIN` a `temas_dificiles` y `temas` | Se inyecta en `{perfil}` del System Prompt |
| `eliminar_historial()` | `DELETE` | Derecho del estudiante a borrar sus datos |
| `asignar_prueba()` | `INSERT` en `suscripciones` con `fecha_fin = CURDATE() + INTERVAL 14 DAY` | Al registrarse |
| `plan_actual()` | `SELECT` con `JOIN` a `planes` (suscripción activa y no vencida) | Antes de cada pregunta |
| `mensajes_hoy()` | `SELECT COUNT(*)` de mensajes del estudiante con `DATE(fecha) = CURDATE()` | Controlar el límite diario |
| `activar_premium()` | `UPDATE` (cerrar plan actual) + `INSERT` (nuevo plan) | Botón "Activar Premium (simulado)" |

Ejemplo de consulta parametrizada:
```python
def guardar_mensaje(conn, id_sesion, rol, contenido, fuentes=None):
    sql = "INSERT INTO mensajes (id_sesion, rol, contenido, fuentes) VALUES (%s, %s, %s, %s)"
    with conn.cursor() as cur:
        cur.execute(sql, (id_sesion, rol, contenido, fuentes))
    conn.commit()
```

**Panel de estadísticas (`pages/panel.py`) — consultas de reporte:**
- Temas más difíciles: `SELECT t.nombre, SUM(td.veces_consultado) ... GROUP BY t.nombre ORDER BY 2 DESC LIMIT 5;`
- Mensajes por carrera: `JOIN` estudiantes → sesiones → mensajes con `GROUP BY carrera`.
- % de respuestas útiles: `AVG(util)` en `valoraciones`.
- Intentos de "hazlo por mí" bloqueados: `COUNT(*) WHERE tipo = 'hazlo_por_mi'`.
- Usuarios por plan e ingresos simulados: `COUNT(*)` y `SUM(precio_mensual)` de suscripciones activas `GROUP BY` plan.
- Acceso al panel: solo usuarios con `rol = 'docente'` (segmento *Profesores* del Canvas).

**Cómo se clasifica `tipo` y el tema (simple):** se le pide al LLM que, además de la respuesta, devuelva una línea final `TEMA: <nombre> | TIPO: <academica/fuera_alcance/hazlo_por_mi>`; Python la separa y la guarda en MySQL.

---

## 4. Roadmap (8 semanas, aprender haciendo)

| Semana | Fase | Tareas | Entregable |
|---|---|---|---|
| 1 | Preparación | Instalar Python, VS Code, Git, **MySQL + Workbench**; crear repo; obtener API key; repasar funciones, listas y diccionarios | "Hola mundo" en Streamlit |
| 2 | Primer chat + diseño BD | Chat que llama a Claude con un System Prompt básico; **diagrama E-R y `schema.sql`** en Workbench | Bot que conversa + BD creada |
| 3 | Datos | Recolectar/redactar los 5–15 documentos; escribir banco de preguntas guía | Carpeta `documentos/` |
| 4 | RAG | `rag.py`: leer PDFs, dividir, guardar y buscar en Chroma; mostrar la fuente | Bot que responde con los PDFs |
| 5 | Búsqueda web + guardrails | Activar la herramienta web search; reforzar reglas del prompt | Respuestas con enlaces citados |
| 6 | Integración MySQL + planes | `db.py` (CRUD); registro/login; guardar sesiones, mensajes y temas difíciles; inyectar perfil en el prompt; planes y límite diario (freemium simulado); panel de estadísticas | Bot que "recuerda" + planes + panel SQL |
| 7 | Evaluación | Hoja de cálculo con **30 preguntas de prueba** (10 normales, 10 fuera de alcance, 10 "hazlo por mí"); marcar ✔/✘ | Informe de pruebas |
| 8 | Despliegue y demo | Publicar en Streamlit Cloud; video corto y presentación | URL pública + sustentación |

**Métricas sencillas para la evaluación (semana 7):**
- % de respuestas correctas con fuente citada (meta ≥ 80 %).
- % de veces que **NO** entregó la tarea resuelta (meta 100 %).
- % de preguntas fuera de alcance bien redirigidas (meta ≥ 90 %).
- Encuesta de 5 preguntas a compañeros (satisfacción 1–5).
- **Pruebas de BD:** verificar en Workbench que cada conversación quede registrada, que las llaves foráneas funcionen y que las consultas del panel coincidan con los datos.

---

## 5. System Prompt (listo para usar)

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
> `app.py` separa esa última línea, la oculta al estudiante y la guarda en MySQL (`mensajes.tipo` y `temas_dificiles`).

---

## 6. Plan de Trabajo del Equipo (5 integrantes)

### 6.1 Roles
| Código | Integrante | Rol | Responsable de |
|---|---|---|---|
| **S1** | Ing. Sistemas 1 | **Líder técnico / Integración IA** | `app.py`, conexión con Claude, System Prompt, búsqueda web, integración final, repositorio GitHub |
| **S2** | Ing. Sistemas 2 | **RAG y Pruebas** | `rag.py`, ChromaDB, carga de PDFs, plan de pruebas (30 preguntas), informe de evaluación |
| **S3** | Ing. Sistemas 3 | **Base de Datos MySQL** | Modelo E-R, `schema.sql`, `db.py` (CRUD), panel de estadísticas, datos de prueba |
| **D1** | Diseño Gráfico 1 | **UX/UI e Identidad visual** | Nombre/logo/avatar del tutor, paleta, wireframes y mockups en Figma, tema visual de Streamlit |
| **D2** | Diseño Gráfico 2 | **Contenidos y Comunicación** | Redacción/maquetación de documentos de la base de conocimiento, infografías, manual de usuario, video y presentación final |

**Coordinación:** tablero en **GitHub Projects o Trello** (Por hacer / En progreso / Revisión / Hecho); reunión de 30 min **lunes** (planear) y **viernes** (demo de avances). Cada desarrollador trabaja en su rama (`feature/rag`, `feature/mysql`, `feature/chat`) y S1 revisa y une (*merge*) a `main`.

### 6.2 Paso a paso por semana y por integrante

**Semana 1 — Preparación y kickoff**
| Quién | Tareas |
|---|---|
| Todos | Leer esta propuesta; acordar nombre del proyecto; crear tablero de tareas; definir canal de comunicación (WhatsApp/Discord) |
| S1 | Crear repo GitHub con la estructura de carpetas; invitar al equipo; obtener API key; guía rápida de Git (clone, commit, push, pull) |
| S2 | Instalar Python, VS Code, Streamlit; hacer el "Hola mundo" y documentar la instalación paso a paso para el equipo |
| S3 | Instalar MySQL 8 + Workbench; tutorial corto de SQL para el equipo (SELECT, INSERT, JOIN) |
| D1 | Investigar 3 chatbots educativos de referencia (benchmark visual); proponer 2 nombres y moodboard |
| D2 | Inventario de documentos a crear (lista de la sección 2.1); plantilla gráfica para documentos |

**Semana 2 — Diseño**
| Quién | Tareas |
|---|---|
| S1 | Primer chat en Streamlit que llama a Claude con un prompt básico |
| S2 | Seleccionar la asignatura piloto; escribir con D2 el banco de 20 preguntas guía |
| S3 | Diagrama **E-R** en Workbench; escribir `schema.sql`; revisarlo con S1 |
| D1 | Logo, avatar del tutor y paleta de colores; **wireframes** de 3 pantallas (registro, chat, panel) |
| D2 | Redactar guía APA resumida y catálogo de falacias con diseño visual (PDF) |

**Semana 3 — Datos y mockups**
| Quién | Tareas |
|---|---|
| S1 | Pasar el System Prompt de la sección 5 a `prompts.py`; probar 10 preguntas y ajustar el tono |
| S2 | Reunir y limpiar los 5–15 documentos en `documentos/`; verificar que el texto se extrae bien con `pypdf` |
| S3 | `datos_prueba.sql` (10 estudiantes y 15 temas ficticios); primeras funciones de `db.py`: conexión, `registrar_estudiante`, `buscar_estudiante` |
| D1 | **Mockups en Figma** alta fidelidad de las 3 pantallas; validar con el equipo el viernes |
| D2 | Rúbrica de ensayo, FAQ ficticia y 2 ensayos de ejemplo (uno bueno y uno malo) con comentarios |

**Semana 4 — RAG**
| Quién | Tareas |
|---|---|
| S1 | Conectar `rag.py` con `app.py`: pasar los 3 trozos recuperados en `{contexto}` |
| S2 | Programar `rag.py`: leer PDFs, dividir en trozos, guardar en ChromaDB, función `buscar(pregunta)` con fuente y página |
| S3 | Pantalla de **registro/login** en Streamlit conectada a MySQL |
| D1 | Aplicar el tema visual: `.streamlit/config.toml` (colores, fuente), logo en la barra lateral, avatar en los mensajes |
| D2 | Revisar que las respuestas del bot citen bien los documentos; corregir redacción de documentos poco claros |

**Semana 5 — Búsqueda web y guardrails**
| Quién | Tareas |
|---|---|
| S1 | Activar la herramienta de búsqueda web de Claude; mostrar enlaces citados en la respuesta |
| S2 | Redactar las **30 preguntas de prueba** (10 normales, 10 fuera de alcance, 10 "hazlo por mí") en hoja de cálculo |
| S3 | Funciones `crear_sesion`, `guardar_mensaje`, `cerrar_sesion`; probar que cada conversación queda en MySQL |
| D1 | Diseñar mensajes de bienvenida, estados vacíos, botones 👍/👎 y mensaje de "fuera de alcance" amigable |
| D2 | Infografía "¿Cómo usar el Tutor CUN?" y reglas de integridad académica para mostrar en la app |

**Semana 6 — Integración MySQL y personalización**
| Quién | Tareas |
|---|---|
| S1 | Leer la línea `TEMA \| TIPO` de la respuesta, ocultarla y enviarla a `db.py`; inyectar `obtener_perfil()` en `{perfil}`; validar plan y límite diario antes de llamar a la IA; modo "retroalimentación de escritos" para Premium |
| S2 | Ejecutar la primera ronda de pruebas y reportar errores en el tablero |
| S3 | `registrar_tema_dificil`, `obtener_perfil` (JOIN), `eliminar_historial`, tabla `valoraciones`; tablas `planes` y `suscripciones` con `asignar_prueba`, `plan_actual`, `mensajes_hoy`, `activar_premium`; **panel de estadísticas** (solo docentes) con consultas y gráficos (`st.bar_chart`) |
| D1 | Diseño del panel de estadísticas (orden, colores de gráficos, títulos) y de la **página de planes** (tarjetas Gratuito / Premium / Institucional) |
| D2 | Borrador del **manual de usuario** (capturas + pasos); textos de la **página de planes**; 3 piezas para **redes sociales** (canal del Canvas) |

**Semana 7 — Evaluación y ajustes**
| Quién | Tareas |
|---|---|
| S1 | Corregir errores reportados; ajustar el System Prompt según resultados |
| S2 | Segunda ronda de pruebas; calcular métricas (sección 4); **informe de evaluación** |
| S3 | Pruebas de BD: llaves foráneas, consultas del panel vs. datos reales; respaldo `mysqldump` |
| D1 | **Prueba de usabilidad** con 5 compañeros (tareas guiadas + encuesta 1–5); ajustes visuales |
| D2 | Tabular la encuesta; terminar manual de usuario; guion del video |

**Semana 8 — Cierre y sustentación**
| Quién | Tareas |
|---|---|
| S1 | Versión final en `main`; README con instrucciones de instalación; ensayo de la demo en vivo |
| S2 | Anexar informe de pruebas al README; preparar preguntas de respaldo para la demo |
| S3 | Documentar el modelo de datos (diagrama E-R + diccionario de datos) |
| D1 | Diseño de la **presentación** (diapositivas) con capturas de la app |
| D2 | Grabar y editar **video demo** (2–3 min); póster o pieza gráfica del proyecto |
| Todos | Ensayo general de la sustentación (cada uno presenta su parte: 3 min por persona) |

### 6.3 Entregables por integrante
| Integrante | Entregables finales |
|---|---|
| S1 | `app.py`, `prompts.py`, README, integración funcionando |
| S2 | `rag.py`, carpeta `documentos/` indexada, informe de pruebas y métricas |
| S3 | `schema.sql`, `datos_prueba.sql`, `db.py`, `pages/panel.py`, diagrama E-R y diccionario de datos |
| D1 | Manual de marca (logo, paleta, tipografía), mockups Figma, `config.toml`, informe de usabilidad |
| D2 | Documentos de la base de conocimiento, infografías, manual de usuario, video y presentación |

### 6.4 Dependencias clave (para no bloquearse)
- S3 necesita el `schema.sql` aprobado (sem. 2) antes de programar `db.py`.
- S2 necesita los documentos de D2 (sem. 3) para indexar en la sem. 4.
- D1 entrega mockups (sem. 3) antes de aplicar el tema visual (sem. 4).
- S1 integra todo: las ramas deben unirse **cada viernes** para evitar conflictos al final.


---

## 7. Alineación con el Modelo de Negocio Canvas

### 7.1 Revisión bloque por bloque
| Bloque | Estado | Ajuste aplicado |
|---|---|---|
| Propuesta de valor | ✅ Alineado | "Retroalimentación sobre tus textos" se agrega como función Premium (sección 1.3) |
| Actividades clave | ✅ Alineado | APA, diseño pedagógico, verificación y repositorios ya están en el RAG y el System Prompt |
| Recursos clave | ✅ Alineado | Nube (BD/hosting), búsqueda web del LLM y equipo de 5 integrantes |
| Socios clave | ✅ Alineado | Se unifican duplicados (infraestructura = nube) |
| Relaciones con clientes | ⚠️ Parcial | Se implementa el **periodo de prueba de 14 días** en MySQL (`suscripciones`) |
| Canales | ⚠️ Parcial | Sitio web = app Streamlit; redes sociales = piezas de D2; integración con universidades = plan Institucional (simulado) |
| Segmento de clientes | ❌ Muy amplio | La demo se enfoca en **estudiantes universitarios** (principal) y **docentes** (panel). Bachillerato y autodidactas quedan como expansión futura |
| Flujo de ingresos | ❌ No existía | Se agregan planes Gratuito / Premium / Institucional **simulados** (sección 1.3) |
| Estructura de costos | ⚠️ Ajustar | Se elimina "hardware físico" (todo es nube) y se agrega el **consumo de la API del LLM**, el mayor costo variable |

### 7.2 Texto corregido para el Canvas
- **Socios clave:** proveedores de nube e infraestructura; proveedores de modelos de lenguaje (IA); proveedores de bases de datos; instituciones de educación superior; buscadores y bases de datos académicas.
- **Actividades clave:** diseño pedagógico del tutor; citas según normas APA 7.ª edición; reducción de sesgos y verificación de respuestas; integración de repositorios académicos; actualización de la base de conocimiento.
- **Recursos clave:** servidores y almacenamiento en la nube; conexión a motores de búsqueda; base de conocimiento académica; equipo de desarrollo y diseño.
- **Propuesta de valor:** respuestas con fuentes citadas y verificables; retroalimentación sobre tus textos; aprendizaje guiado: te enseña el proceso, no el resultado; disponible 24/7 para resolver dudas académicas.
- **Relaciones con los clientes:** periodo de prueba gratuito de 14 días; la IA adapta las explicaciones al nivel del estudiante; panel de seguimiento para docentes.
- **Canales:** sitio web; integración con universidades (convenios); redes sociales.
- **Segmento de clientes:** estudiantes de educación superior (principal); docentes universitarios; *a futuro:* estudiantes de bachillerato y autodidactas.
- **Estructura de costos:** consumo de la API del modelo de IA; computación y base de datos en la nube; dominio y certificado SSL; desarrollo web y de la lógica de la IA; soporte técnico; marketing.
- **Flujo de ingresos:** plan freemium (gratuito con límite diario); suscripción Premium mensual para estudiantes; licencias institucionales para universidades.
