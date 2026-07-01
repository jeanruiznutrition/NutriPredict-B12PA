// ============================================================
// B12 Risk Screen — B12 Risk Estimation Algorithm (BREA v1.0)
// Motor de cálculo determinista: distribución en semana virtual,
// fórmula de absorción fisiológica y asignación de suplementación.
//
// © Jean Carlos Ruiz Mosley. Todos los derechos reservados.
// ============================================================

        // Mapeo base de días de la semana con distribución uniforme para maximizar separación temporal
        const mapDiasDeterministas = (numDias) => {
            switch (numDias) {
                case 1: return [2]; // Miércoles
                case 2: return [1, 4]; // Martes, Viernes
                case 3: return [0, 2, 5]; // Lunes, Miércoles, Sábado
                case 4: return [0, 1, 3, 5]; // Lunes, Martes, Jueves, Sábado
                case 5: return [0, 1, 2, 4, 6]; // Lunes, Martes, Miércoles, Viernes, Domingo
                case 6: return [0, 1, 3, 4, 5, 6]; // Todos excepto Miércoles
                case 7: return [0, 1, 2, 3, 4, 5, 6]; // Todos los días
                default: return [];
            }
        };

        // Distribución inteligente de comidas según la frecuencia del alimento para evitar colisiones críticas
        const mapComidasPorVeces = (vecesAlDia, foodId) => {
            if (vecesAlDia === 1) {
                switch(foodId) {
                    case 'carne': return [1];      // Almuerzo
                    case 'leche': return [0];      // Desayuno (separado de carne)
                    case 'huevo': return [2];      // Cena (separado de carne)
                    case 'bebida_veg': return [0]; // Desayuno
                    case 'levadura': return [1];   // Almuerzo
                    default: return [1];
                }
            }
            if (vecesAlDia === 2) {
                switch(foodId) {
                    case 'carne': return [1, 2];      // Almuerzo, Cena
                    case 'leche': return [0, 1];      // Desayuno, Almuerzo (para reducir coincidencia en Cena)
                    case 'huevo': return [0, 2];      // Desayuno, Cena (para reducir coincidencia en Almuerzo)
                    case 'bebida_veg': return [0, 1]; // Desayuno, Almuerzo
                    case 'levadura': return [1, 2];   // Almuerzo, Cena
                    default: return [0, 2];
                }
            }
            if (vecesAlDia === 3) {
                return [0, 1, 2]; // Desayuno, Almuerzo y Cena
            }
            return [];
        };

        // Función científica para calcular la absorción considerando transporte activo saturable (FI) y difusión pasiva (2%)
        const calcularAbsorcionFisiologica = (ingerido) => {
            if (ingerido <= 0) return 0;
            
            // Corrección Metodológica: A dosis farmacológicas altas (≥ 100 µg), la absorción 
            // por difusión pasiva pura garantiza clínicamente cubrir la cuota metabólica de 4 µg diarios.
            if (ingerido >= 100.0) {
                return 4.0;
            }

            const activo = Math.min(ingerido, ABSORCION_MAXIMA_POR_COMIDA);
            const pasivo = ingerido > ABSORCION_MAXIMA_POR_COMIDA ? (ingerido - ABSORCION_MAXIMA_POR_COMIDA) * 0.02 : 0;
            return Math.round((activo + pasivo) * 100) / 100;
        };

        const ejecutarAlgoritmoBREA = (alimentos, suplementacion) => {
            // Inicializar matriz de la semana virtual (7 días x 3 comidas)
            let semanaVirtual = Array(7).fill(null).map(() => 
                Array(3).fill(null).map(() => ({
                    alimentos: [],
                    totalIngerido: 0,
                    totalAbsorbido: 0,
                    suplementoAgregado: null
                }))
            );

            // 1. Distribuir alimentos primero aplicando desfases para optimizar asimilación
            alimentos.forEach(alimento => {
                const { id, diasPorSemana, vecesPorDia, porcionesPorComida, b12Porporcion, offsetDia } = alimento;
                
                if (diasPorSemana === 0 || vecesPorDia === 0 || porcionesPorComida === 0) return;

                // Obtener distribución de días base y aplicar el offset específico del alimento
                const baseDias = mapDiasDeterministas(diasPorSemana);
                const diasAsignados = baseDias.map(dia => (dia + offsetDia) % 7);
                
                // Obtener distribución de comidas staggerizada
                const comidasAsignadas = mapComidasPorVeces(vecesPorDia, id);

                diasAsignados.forEach(diaIdx => {
                    comidasAsignadas.forEach(comidaIdx => {
                        const b12Ingerida = b12Porporcion * porcionesPorComida;
                        semanaVirtual[diaIdx][comidaIdx].alimentos.push({
                            id: id,
                            nombreKey: alimento.nombreKey,
                            porciones: porcionesPorComida,
                            b12Ingerida: b12Ingerida
                        });
                        semanaVirtual[diaIdx][comidaIdx].totalIngerido += b12Ingerida;
                    });
                });
            });

            // 2. Distribuir suplementos de forma dinámica basándonos en la carga actual de alimentos
            const esSuplementoSemanal = ['1000_3x', '1250_2x', '2500_1x'].includes(suplementacion);
            const esSuplementoDiario = ['1.4_3x', '5_1x', '5_2x', '100_1x'].includes(suplementacion);

            if (esSuplementoDiario) {
                for (let d = 0; d < 7; d++) {
                    if (suplementacion === '1.4_3x') {
                        // 1.4 mcg 3 veces al día: se agrega a todas las comidas
                        [0, 1, 2].forEach(c => {
                            semanaVirtual[d][c].totalIngerido += 1.4;
                            semanaVirtual[d][c].suplementoAgregado = { dosis: 1.4, etiqueta: '1.4 µg' };
                        });
                    } else if (suplementacion === '5_1x' || suplementacion === '100_1x') {
                        const dosis = suplementacion === '5_1x' ? 5.0 : 100.0;
                        
                        // Buscar la comida con menor cantidad de B12 de alimentos
                        const comidasOrdenadas = [0, 1, 2].map(c => ({
                            index: c,
                            b12Alimentos: semanaVirtual[d][c].totalIngerido
                        })).sort((a, b) => a.b12Alimentos - b.b12Alimentos);

                        const comidaDestino = comidasOrdenadas[0].index;
                        semanaVirtual[d][comidaDestino].totalIngerido += dosis;
                        semanaVirtual[d][comidaDestino].suplementoAgregado = { 
                            dosis: dosis, 
                            etiqueta: `${dosis} µg` 
                        };
                    } else if (suplementacion === '5_2x') {
                        const dosis = 5.0;

                        // Buscar las dos comidas con menor cantidad de B12 de alimentos
                        const comidasOrdenadas = [0, 1, 2].map(c => ({
                            index: c,
                            b12Alimentos: semanaVirtual[d][c].totalIngerido
                        })).sort((a, b) => a.b12Alimentos - b.b12Alimentos);

                        [comidasOrdenadas[0].index, comidasOrdenadas[1].index].forEach(comidaDestino => {
                            semanaVirtual[d][comidaDestino].totalIngerido += dosis;
                            semanaVirtual[d][comidaDestino].suplementoAgregado = { 
                                dosis: dosis, 
                                etiqueta: '5 µg' 
                            };
                        });
                    }
                }
            }

            // 3. Aplicar el cálculo de absorción fisiológica por comida
            let diasCumplidosCount = 0;
            let diasNoCumplidosCount = 0;
            const reporteDias = [];

            semanaVirtual.forEach((dia, diaIdx) => {
                let absorbidoDia = 0;
                let ingeridoDia = 0;
                
                const comidasDetalle = dia.map((comida, comidaIdx) => {
                    const absorbidoComida = calcularAbsorcionFisiologica(comida.totalIngerido);
                    dia[comidaIdx].totalAbsorbido = absorbidoComida;
                    absorbidoDia += absorbidoComida;
                    ingeridoDia += comida.totalIngerido;
                    
                    return {
                        nombreKey: `comida_${comidaIdx}`,
                        alimentosConsumidos: comida.alimentos,
                        suplemento: comida.suplementoAgregado,
                        totalIngerido: comida.totalIngerido,
                        totalAbsorbido: absorbidoComida
                    };
                });

                // Si tiene suplementación semanal, asume adecuación excelente automática (reservas corporales cubiertas)
                const cumpleMeta = esSuplementoSemanal ? true : (absorbidoDia >= META_ABSORCION_DIARIA);
                
                if (cumpleMeta) {
                    diasCumplidosCount++;
                } else {
                    diasNoCumplidosCount++;
                }

                reporteDias.push({
                    diaNombreKey: DIAS_SEMANA[diaIdx].nameKey,
                    diaCortoKey: DIAS_SEMANA[diaIdx].shortKey,
                    comidas: comidasDetalle,
                    totalIngeridoDia: ingeridoDia,
                    totalAbsorbidoDia: esSuplementoSemanal ? META_ABSORCION_DIARIA : Math.round(absorbidoDia * 100) / 100,
                    cumpleMeta: cumpleMeta,
                    origenMetabolico: esSuplementoSemanal ? 'Suplementación Semanal de Alta Dosis (Reservas cubiertas)' : 'Asimilación virtual normal'
                });
            });

            const porcentajeCumplimiento = (diasCumplidosCount / 7) * 100;

            return {
                semanaVirtual,
                reporteDias,
                diasCumplidos: diasCumplidosCount,
                diasNoCumplidos: diasNoCumplidosCount,
                porcentajeCumplimiento: Math.round(porcentajeCumplimiento * 10) / 10,
                promedioAbsorbidoSemanal: Math.round((reporteDias.reduce((acc, d) => acc + d.totalAbsorbidoDia, 0) / 7) * 100) / 100
            };
        };

