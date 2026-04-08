# 📁 VISUAL BUILDER - ARCHIVOS Y ESTRUCTURA

**Fecha:** 8 de Enero, 2025  
**Estado:** 🔴 NO FUNCIONAL - Re-renders infinitos  
**Progreso:** 70% completo

---

## 📋 **ARCHIVOS PRINCIPALES**

### **1. Componente Visual Builder**

**Archivo:** `web/components/visual-builder/VisualBuilder.tsx`  
**Tamaño:** 24.1KB (700 líneas)  
**Última modificación:** 8 Dic 2025, 9:35 AM  
**Estado:** 🔴 BUGGY

**Descripción:**
Componente principal del Visual Builder tipo Canva. Implementa drag & drop nativo HTML5, resize de
elementos, selección, y properties panel.

**Funcionalidad:**

- 3 panel layout (Elements, Canvas, Properties)
- Drag & drop desde sidebar al canvas
- Drag dentro del canvas para reposicionar
- Resize con 6 handles (4 esquinas + 2 bordes)
- Selection system con ring azul
- Layers panel
- 5 tipos de elementos: Bio, Image, Text, Button, Stats

**Problema actual:**

- Re-renders infinitos
- Properties Panel NO responde a inputs
- `useCallback` con dependencias incorrectas
- Closures sobre `elements` array

**Líneas clave:**

- Línea 383: Export del componente `VisualBuilder()`
- Todo el código está en un solo archivo (700 líneas)

---

### **2. Página de Landing Settings**

**Archivo:** `web/app/(dashboard)/dashboard/c/[slug]/settings/landing/page.tsx`  
**Tamaño:** ~15KB (~475 líneas)  
**Estado:** ✅ FUNCIONAL (Simple Editor) / 🔴 BUGGY (Visual Builder)

**Descripción:**
Página de configuración de landing page que contiene tanto el Simple Editor (funcional) como el
Visual Builder (buggy).

**Funcionalidad:**

- Tabs para cambiar entre "Simple Editor" y "Visual Builder"
- Simple Editor con preview en tiempo real (✅ funciona)
- Import del VisualBuilder component (línea 7)
- Renderiza el VisualBuilder cuando `editorMode === "visual"` (línea 475)

**Líneas importantes:**

```tsx
Line 7: import { VisualBuilder } from "@/components/visual-builder/VisualBuilder";
Line 155: const [editorMode, setEditorMode] = useState<"simple" | "visual">("simple");
Line 178-195: Tabs para cambiar modo
Line 475: <VisualBuilder />
```

**Ruta de acceso:**
`/dashboard/c/[slug]/settings/landing`

---

## 📂 **ESTRUCTURA DE DIRECTORIOS**

```
web/
├── components/
│   └── visual-builder/
│       └── VisualBuilder.tsx           # 🔴 Componente principal (BUGGY)
│
├── app/
│   └── (dashboard)/dashboard/c/[slug]/settings/
│       └── landing/
│           └── page.tsx                # ✅/🔴 Página con tabs (Simple + Visual)
│
└── components/ui/
    └── image-uploader.tsx              # ✅ Component usado por Visual Builder
```

---

## 🔧 **ARCHIVOS RELACIONADOS**

### **3. Image Uploader Component**

**Archivo:** `web/components/ui/image-uploader.tsx`  
**Estado:** ✅ FUNCIONAL  
**Usado por:** VisualBuilder (para elementos de tipo Image)

**Descripción:**
Componente reutilizable para subir imágenes con dual mode (Upload desde PC o Paste URL).

**Features:**

- Tabs: "Upload from PC" / "Use URL"
- Integración con UploadThing
- Preview de imagen
- Loading state
- Error handling

---

### **4. API Route - Landing Customization**

**Archivo:** `web/app/api/communities/[slug]/landing/route.ts`  
**Estado:** ✅ FUNCIONAL  
**Propósito:** Guardar configuración de landing page

**Endpoints:**

- `PATCH /api/communities/[slug]/landing` - Guarda ownerBio, customImages, etc.

**Nota:** Por ahora solo guarda la configuración del Simple Editor. El Visual Builder necesitará su
propio endpoint para guardar layouts.

---

### **5. UI Components (usados por Visual Builder)**

**Ubicación:** `web/components/ui/`

**Componentes relevantes:**

- `button.tsx` - Botones de navegación y acciones
- `input.tsx` - Inputs en Properties Panel
- `label.tsx` - Labels para inputs
- `tabs.tsx` - Tabs para cambiar entre Simple/Visual mode

**Estado:** ✅ FUNCIONALES

---

## 🐛 **PROBLEMAS IDENTIFICADOS**

### **Archivo problemático:** `VisualBuilder.tsx`

**Problema 1: Re-renders infinitos**

```tsx
// Línea ~383-700
export function VisualBuilder() {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  // ❌ PROBLEMA: updateElement tiene closure sobre elements
  function updateElement(id: string, updates: Partial<CanvasElement>) {
    setElements(elements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ));
  }
  
  // ❌ PROBLEMA: useCallback sin dependencies correctas
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    // ... usa elements implícitamente
  }, []); // Dependencies vacías causan stale closures
}
```

**Problema 2: Properties Panel no responde**

```tsx
// El textarea para editar texto no captura onChange
{selectedElement.type === "text" && (
  <textarea
    value={selectedElement.content}
    onChange={(e) => {
      // ❌ Esta función se recrea en cada render
      updateElement(selectedElement.id, { content: e.target.value });
    }}
  />
)}
```

**Problema 3: Console.logs y alerts agregados para debug**

```tsx
// ❌ Estos causan más re-renders
console.log("Total Elements:", elements.length);
alert("Element clicked! ID: " + id);
```

---

## ✅ **SOLUCIONES PROPUESTAS**

### **Opción 1: useReducer**

**Crear nuevo archivo:** `web/components/visual-builder/visualBuilderReducer.ts`

```typescript
type CanvasElement = {
  id: string;
  type: "text" | "image" | "button" | "bio" | "stats";
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  // ... más props
};

type Action =
  | { type: "ADD_ELEMENT"; element: CanvasElement }
  | { type: "UPDATE_ELEMENT"; id: string; updates: Partial<CanvasElement> }
  | { type: "DELETE_ELEMENT"; id: string }
  | { type: "SELECT_ELEMENT"; id: string | null };

function visualBuilderReducer(state: CanvasElement[], action: Action) {
  switch (action.type) {
    case "ADD_ELEMENT":
      return [...state, action.element];
    case "UPDATE_ELEMENT":
      return state.map(el => 
        el.id === action.id ? { ...el, ...action.updates } : el
      );
    case "DELETE_ELEMENT":
      return state.filter(el => el.id !== action.id);
    default:
      return state;
  }
}
```

**Modificar:** `VisualBuilder.tsx`

```tsx
export function VisualBuilder() {
  const [elements, dispatch] = useReducer(visualBuilderReducer, []);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  // ✅ Sin closures problemáticos
  function updateElement(id: string, updates: Partial<CanvasElement>) {
    dispatch({ type: "UPDATE_ELEMENT", id, updates });
  }
}
```

---

### **Opción 2: Context API**

**Crear nuevos archivos:**

1. `web/components/visual-builder/VisualBuilderContext.tsx`
2. `web/components/visual-builder/VisualBuilderProvider.tsx`
3. `web/components/visual-builder/useVisualBuilder.ts` (custom hook)

**Estructura:**

```tsx
// VisualBuilderContext.tsx
const VisualBuilderContext = createContext<VisualBuilderContextType | null>(null);

// VisualBuilderProvider.tsx
export function VisualBuilderProvider({ children }) {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  
  const value = useMemo(() => ({
    elements,
    addElement: (element) => setElements(prev => [...prev, element]),
    updateElement: (id, updates) => setElements(prev => 
      prev.map(el => el.id === id ? { ...el, ...updates } : el)
    ),
    // ... más funciones
  }), [elements]);
  
  return (
    <VisualBuilderContext.Provider value={value}>
      {children}
    </VisualBuilderContext.Provider>
  );
}

// useVisualBuilder.ts
export function useVisualBuilder() {
  const context = useContext(VisualBuilderContext);
  if (!context) throw new Error("useVisualBuilder must be used within VisualBuilderProvider");
  return context;
}
```

---

### **Opción 3: Zustand (State Management Library)**

**Instalar:**

```bash
npm install zustand
```

**Crear nuevo archivo:** `web/stores/visualBuilderStore.ts`

```typescript
import { create } from "zustand";

type VisualBuilderStore = {
  elements: CanvasElement[];
  selectedElementId: string | null;
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  selectElement: (id: string | null) => void;
};

export const useVisualBuilderStore = create<VisualBuilderStore>((set) => ({
  elements: [],
  selectedElementId: null,
  
  addElement: (element) => set((state) => ({
    elements: [...state.elements, element]
  })),
  
  updateElement: (id, updates) => set((state) => ({
    elements: state.elements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    )
  })),
  
  deleteElement: (id) => set((state) => ({
    elements: state.elements.filter(el => el.id !== id),
    selectedElementId: state.selectedElementId === id ? null : state.selectedElementId
  })),
  
  selectElement: (id) => set({ selectedElementId: id }),
}));
```

**Modificar:** `VisualBuilder.tsx`

```tsx
import { useVisualBuilderStore } from "@/stores/visualBuilderStore";

export function VisualBuilder() {
  const { elements, selectedElementId, updateElement, selectElement } = useVisualBuilderStore();
  
  // ✅ Sin re-renders infinitos
  // ✅ Sin closures problemáticos
}
```

---

## 📝 **CHECKLIST DE REFACTORING**

### **Paso 1: Backup**

- [ ] Crear backup de `VisualBuilder.tsx` → `VisualBuilder.backup.tsx`
- [ ] Commit actual antes de cambios

### **Paso 2: Elegir solución**

- [ ] Opción 1: useReducer (más simple, solo React)
- [ ] Opción 2: Context API (más escalable)
- [ ] Opción 3: Zustand (más performante)

### **Paso 3: Implementar solución**

- [ ] Crear archivos nuevos necesarios
- [ ] Refactorizar state management
- [ ] Eliminar todos los console.logs y alerts
- [ ] Limpiar closures problemáticos

### **Paso 4: Testing**

- [ ] Drag & drop funciona ✅
- [ ] Posicionamiento correcto ✅
- [ ] Resize funciona ✅
- [ ] **Properties Panel responde** ❌ → ✅
- [ ] No hay re-renders infinitos ❌ → ✅
- [ ] Layers panel actualiza ✅

### **Paso 5: Persistencia**

- [ ] Crear API endpoint: `PATCH /api/communities/[slug]/layout`
- [ ] Guardar elementos en DB (JSON field)
- [ ] Cargar elementos al abrir Visual Builder
- [ ] Agregar botón "Save Layout"

---

## 🗂️ **ARCHIVOS QUE SE CREARÁN (según solución)**

### **Si usamos useReducer:**

```
web/components/visual-builder/
├── VisualBuilder.tsx           # Refactorizado
├── visualBuilderReducer.ts     # NUEVO - Reducer logic
└── types.ts                    # NUEVO - TypeScript types
```

### **Si usamos Context API:**

```
web/components/visual-builder/
├── VisualBuilder.tsx                # Refactorizado
├── VisualBuilderContext.tsx         # NUEVO - Context
├── VisualBuilderProvider.tsx        # NUEVO - Provider
├── useVisualBuilder.ts              # NUEVO - Custom hook
└── types.ts                         # NUEVO - TypeScript types
```

### **Si usamos Zustand:**

```
web/
├── stores/
│   └── visualBuilderStore.ts       # NUEVO - Zustand store
└── components/visual-builder/
    ├── VisualBuilder.tsx            # Refactorizado
    └── types.ts                     # NUEVO - TypeScript types
```

---

## 🚀 **PRÓXIMOS PASOS RECOMENDADOS**

### **Inmediato (2-3 horas):**

1. ✅ Elegir **Opción 1: useReducer** (más simple para empezar)
2. ✅ Crear `visualBuilderReducer.ts` y `types.ts`
3. ✅ Refactorizar `VisualBuilder.tsx`
4. ✅ Eliminar console.logs y alerts
5. ✅ Testing completo

### **Después de funcionar (1-2 horas):**

6. ✅ Crear API endpoint para guardar layouts
7. ✅ Agregar botón "Save Layout"
8. ✅ Cargar layout guardado al abrir
9. ✅ Export/Preview del diseño

### **Opcional (mejoras futuras):**

10. Undo/Redo functionality
11. Copy/Paste elementos
12. Snap to grid
13. Alineación automática
14. Más tipos de elementos
15. Templates predefinidos

---

## 📊 **ESTADO ACTUAL vs DESEADO**

| Feature | Estado Actual | Deseado | Blocker |
|---------|---------------|---------|---------|
| Drag & Drop | ✅ Funciona | ✅ | - |
| Posicionamiento | ✅ Funciona | ✅ | - |
| Resize | ✅ Funciona | ✅ | - |
| Selection | ✅ Funciona | ✅ | - |
| Layers Panel | ✅ Funciona | ✅ | - |
| **Properties Panel** | ❌ NO responde | ✅ | 🔴 Re-renders infinitos |
| **Editar texto** | ❌ NO funciona | ✅ | 🔴 Properties Panel |
| **Upload imágenes** | ❌ NO funciona | ✅ | 🔴 Properties Panel |
| **Guardar layout** | ❌ No implementado | ✅ | Pendiente API |
| **Cargar layout** | ❌ No implementado | ✅ | Pendiente API |

---

## 💡 **CONCLUSIÓN**

El Visual Builder está **70% completo** pero tiene un **blocker crítico** que impide su
funcionamiento:

**PROBLEMA:** Re-renders infinitos causados por state management incorrecto  
**SOLUCIÓN:** Refactorizar con useReducer, Context API, o Zustand  
**TIEMPO ESTIMADO:** 2-3 horas para arreglar + 1-2 horas para persistencia  
**PRIORIDAD:** 🔥 **CRÍTICA**

Una vez arreglado, el Visual Builder será una feature única que Skool no tiene, dándole a Unytea una
ventaja competitiva significativa. 🚀

---

**Última actualización:** 8 de Enero, 2025  
**Autor:** AI Assistant (Claude)  
**Proyecto:** Unytea - Visual Builder Documentation