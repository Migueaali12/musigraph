# MusiGraph — Explorador Musical Semántico

MusiGraph es una aplicación web **open source** que te permite **explorar el universo musical como un grafo de conocimiento**: artistas, géneros, álbumes, influencias y colaboraciones conectadas entre sí.

El proyecto consulta datos en tiempo real desde **Wikidata** mediante **SPARQL**, y los presenta de forma clara e interactiva para que puedas **descubrir relaciones** que normalmente no se ven en una búsqueda tradicional.

> Estado: en desarrollo (MVP). Este repositorio se enfoca en construir una base sólida para exploración semántica y visualización de relaciones musicales.

---

## ¿Por qué MusiGraph?

La información musical en la web suele estar fragmentada: biografías por un lado, discografías por otro, influencias y colaboraciones en páginas separadas. MusiGraph busca unificarlo con un enfoque de **datos semánticos**:

- **Descubrimiento**: encontrar artistas relacionados por influencias, escenas, movimientos o colaboraciones.
- **Aprendizaje**: entender cómo evolucionan géneros y conexiones culturales a través del tiempo.
- **Demostración técnica**: mostrar el poder de SPARQL + conocimiento abierto (Wikidata) aplicado a música.

---

## Características (actuales y planeadas)

> Algunas funciones pueden estar en progreso. La visión completa está detallada en [`Requirements.md`](./Requirements.md).

- Búsqueda de artistas/bandas.
- Consulta a **Wikidata Query Service** (SPARQL) para obtener datos estructurados.
- Presentación de información musical conectada.
- (Plan) Visualizaciones: red/grafo de influencias, timeline, colaboraciones.
- (Plan) Filtros por género, década, país, tipo de artista.

---

## Tecnologías

- **Next.js** (App Router)
- **React**
- **TypeScript**
- **Tailwind CSS**

---

## Fuente de datos

- **Wikidata**: `https://query.wikidata.org/sparql`

Wikidata ofrece datos musicales amplios, multilingües y mantenidos por la comunidad. MusiGraph construye consultas SPARQL para recuperar:

- información básica del artista
- géneros
- discografía
- influencias (`wdt:P737`)
- colaboraciones (según modelos de datos disponibles en Wikidata)

---

## Cómo ejecutar el proyecto

### Requisitos

- Node.js (recomendado: LTS)
- npm (incluido con Node) o tu gestor preferido

### Instalación

```bash
npm install
```

### Desarrollo

```bash
npm run dev
```

Abre `http://localhost:3000` en el navegador.

### Build y producción

```bash
npm run build
npm run start
```

---

## Estructura del repositorio (alto nivel)

- `src/` — código fuente de la aplicación
- `public/` — recursos estáticos
- `Requirements.md` — visión/alcance del producto, consultas base SPARQL y especificación funcional

---

## Contribuir

¡Contribuciones son bienvenidas!

1. Haz un fork del repositorio
2. Crea una rama con tu cambio: `git checkout -b feature/mi-cambio`
3. Ejecuta el proyecto localmente y verifica que todo funciona
4. Abre un Pull Request describiendo:
   - qué problema resuelve
   - cómo probarlo
   - capturas de pantalla si aplica

Sugerencias de contribución:

- mejorar consultas SPARQL (rendimiento / cobertura)
- agregar visualizaciones (grafos, timelines)
- mejorar UI/UX
- añadir tests
- documentación

---

## Roadmap (orientativo)

- [ ] MVP de búsqueda de artista y ficha básica
- [ ] Discografía + timeline
- [ ] Red de influencias (grafo interactivo)
- [ ] Colaboraciones y “grados de separación”
- [ ] Cache / optimización de consultas
- [ ] Despliegue (Vercel)

---

## Licencia

Este proyecto está licenciado bajo la [MIT License](./LICENSE).

---

## Créditos

- Datos: **Wikidata** y su comunidad
- Stack: **Next.js** / **React**
