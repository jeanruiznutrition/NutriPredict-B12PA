// ============================================================
// B12 Risk Screen — Datos y constantes del modelo (BREA v1.0)
// Catálogo de alimentos, constantes fisiológicas y estructura
// de la semana virtual. No contiene lógica de cálculo.
// ============================================================

        // Constantes fisiológicas inalterables (Límites de saturación celular y metas)
        const ABSORCION_MAXIMA_POR_COMIDA = 2.0; // µg (Techo del Factor Intrínseco)
        const META_ABSORCION_DIARIA = 4.0; // µg (Recomendación diaria epidemiológica)

        // Catálogo inmutable de alimentos con valores de vitamina B12 estáticos
        const ALIMENTOS_INICIALES = [
            { 
                id: 'carne', 
                nombreKey: 'food_meat', 
                b12Porporcion: 2.0, 
                porcionUnidadKey: 'unit_meat', 
                icono: 'fa-solid fa-drumstick-bite',
                permitePorciones: false,
                offsetDia: 0 // Base de referencia
            },
            { 
                id: 'huevo', 
                nombreKey: 'food_egg', 
                b12Porporcion: 0.5, 
                porcionUnidadKey: 'unit_egg', 
                icono: 'fa-solid fa-egg',
                permitePorciones: true,
                maxPorciones: 4,
                offsetDia: 2 // Desplazado para evitar coincidencia con carne
            },
            { 
                id: 'leche', 
                nombreKey: 'food_milk', 
                b12Porporcion: 1.0, 
                porcionUnidadKey: 'unit_milk', 
                icono: 'fa-solid fa-glass-water',
                permitePorciones: true,
                maxPorciones: 2,
                offsetDia: 4 // Desplazado para evitar coincidencia con carne
            },
            { 
                id: 'bebida_veg', 
                nombreKey: 'food_plant_drink', 
                b12Porporcion: 0.5, 
                porcionUnidadKey: 'unit_plant_drink', 
                icono: 'fa-solid fa-seedling',
                permitePorciones: true,
                maxPorciones: 2,
                offsetDia: 1
            },
            { 
                id: 'levadura', 
                nombreKey: 'food_yeast', 
                b12Porporcion: 2.0, 
                porcionUnidadKey: 'unit_yeast', 
                icono: 'fa-solid fa-spoon',
                permitePorciones: false,
                offsetDia: 3
            }
        ];

        const DIAS_SEMANA = [
            { id: 0, shortKey: 'day_0_short', nameKey: 'day_0' },
            { id: 1, shortKey: 'day_1_short', nameKey: 'day_1' },
            { id: 2, fontBold: true, shortKey: 'day_2_short', nameKey: 'day_2' },
            { id: 3, shortKey: 'day_3_short', nameKey: 'day_3' },
            { id: 4, shortKey: 'day_4_short', nameKey: 'day_4' },
            { id: 5, shortKey: 'day_5_short', nameKey: 'day_5' },
            { id: 6, shortKey: 'day_6_short', nameKey: 'day_6' }
        ];
