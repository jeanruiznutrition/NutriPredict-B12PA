// ============================================================
// B12 Risk Screen — Componente principal de la interfaz (React)
// Consume: TRANSLATIONS (i18n.js), ALIMENTOS_INICIALES / DIAS_SEMANA
// (data.js) y ejecutarAlgoritmoBREA (algorithm.js).
// ============================================================

const { useState, useEffect, useMemo } = React;

        function App() {
            const [darkMode, setDarkMode] = useState(false);
            const [lang, setLang] = useState('es'); // Idioma activo: es, en, fi, de, it, ko, ja
            
            // Estado para el Cuestionario de Frecuencia (FFQ)
            const [alimentos, setAlimentos] = useState(
                ALIMENTOS_INICIALES.map(al => ({
                    ...al,
                    diasPorSemana: 0, 
                    vecesPorDia: 1, 
                    porcionesPorComida: 1.0 
                }))
            );

            // Perfil clínico (Dieta del participante)
            const [perfil, setPerfil] = useState({
                grupoEstudio: 'Vegano'
            });

            // Estado de suplementación con cianocobalamina
            const [suplementacion, setSuplementacion] = useState('ninguna');

            // Estado del módulo de interpretación de resultados de laboratorio (B12 sérica + marcador funcional)
            const [labValor, setLabValor] = useState('');
            const [labUnidad, setLabUnidad] = useState('pgml'); // 'pgml' o 'pmoll'
            const [labMarcador, setLabMarcador] = useState(''); // 'homocisteina' o 'amd'
            const [labMarcadorResultado, setLabMarcadorResultado] = useState(''); // 'normal' o 'elevado'

            // Filtro dinámico de alimentos basados en el patrón dietético
            const alimentosFiltrados = useMemo(() => {
                return alimentos.filter(al => {
                    if (perfil.grupoEstudio === 'Vegano') {
                        return al.id !== 'carne' && al.id !== 'huevo' && al.id !== 'leche';
                    }
                    if (perfil.grupoEstudio === 'Ovolactovegetariano') {
                        return al.id !== 'carne';
                    }
                    return true;
                });
            }, [alimentos, perfil.grupoEstudio]);

            useEffect(() => {
                if (darkMode) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            }, [darkMode]);

            // Gestión de actualizaciones en el cuestionario de consumo
            const handleAlimentoChange = (id, campo, valor) => {
                setAlimentos(prev => prev.map(al => {
                    if (al.id === id) {
                        return { ...al, [campo]: valor };
                    }
                    return al;
                }));
            };

            // Manejador del cambio de dieta con reinicio de valores ocultos
            const handleGrupoEstudioChange = (nuevoGrupo) => {
                setPerfil(prev => ({ ...prev, grupoEstudio: nuevoGrupo }));
                setAlimentos(prev => prev.map(al => {
                    const esOcultoEnVegano = ['carne', 'huevo', 'leche'].includes(al.id);
                    const esOcultoEnOvolacto = ['carne'].includes(al.id);
                    
                    if (nuevoGrupo === 'Vegano' && esOcultoEnVegano) {
                        return { ...al, diasPorSemana: 0, vecesPorDia: 1, porcionesPorComida: 1.0 };
                    }
                    if (nuevoGrupo === 'Ovolactovegetariano' && esOcultoEnOvolacto) {
                        return { ...al, diasPorSemana: 0, vecesPorDia: 1, porcionesPorComida: 1.0 };
                    }
                    return al;
                }));
            };

            // Cálculo reactivo mediante useMemo usando los alimentos filtrados y el estado de suplementación
            const resultados = useMemo(() => {
                return ejecutarAlgoritmoBREA(alimentosFiltrados, suplementacion);
            }, [alimentosFiltrados, suplementacion]);

            // Traducciones dinámicas rápidas
            const t = (key) => {
                return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['es']?.[key] || key;
            };

            // Clasificación diagnóstica de adecuación
            const clasificarRiesgo = (pct) => {
                if (pct >= 80) return { 
                    clasificacion: t('diag_excellent'), 
                    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/20', 
                    descripcion: t('diag_excellent_desc'), 
                    severidad: t('diag_sev_low') 
                };
                if (pct >= 50) return { 
                    clasificacion: t('diag_moderate'), 
                    color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30 border-amber-500/20', 
                    descripcion: t('diag_moderate_desc'), 
                    severidad: t('diag_sev_mod') 
                };
                return { 
                    clasificacion: t('diag_low'), 
                    color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/30 border-rose-500/20', 
                    descripcion: t('diag_low_desc'), 
                    severidad: t('diag_sev_high') 
                };
            };

            const infoRiesgo = clasificarRiesgo(resultados.porcentajeCumplimiento);

            const exportarExcel = () => {
                let csvContent = "data:text/csv;charset=utf-8,";
                csvContent += "B12 Risk Screen - Resultados del Algoritmo BREA v1.0\r\n";
                csvContent += "(C) 2026 Jean Carlos Ruiz Mosley - Todos los derechos reservados\r\n";
                csvContent += "Investigador Principal;Jean Carlos Ruiz Mosley\r\n";
                csvContent += `Patron Dietetico;${perfil.grupoEstudio}\r\n`;
                csvContent += `Suplementacion Seleccionada;${suplementacion}\r\n`;
                csvContent += `Porcentaje de Cumplimiento Semanal;${resultados.porcentajeCumplimiento}%\r\n`;
                csvContent += `Dias Adecuados (>=4 ug);${resultados.diasCumplidos}\r\n`;
                csvContent += `Dias Inadecuados (<4 ug);${resultados.diasNoCumplidos}\r\n`;
                csvContent += `Promedio Absorbido Estimado (ug/dia);${resultados.promedioAbsorbidoSemanal}\r\n\r\n`;
                
                csvContent += "Frecuencias Reportadas (FFQ):\r\n";
                csvContent += "Alimento;Dias por Semana;Veces al Dia;Porciones por Comida;B12 por Porcion (ug)\r\n";
                alimentosFiltrados.forEach(al => {
                    csvContent += `${t(al.nombreKey)};${al.diasPorSemana};${al.vecesPorDia};${al.porcionesPorComida};${al.b12Porporcion}\r\n`;
                });

                csvContent += "\r\nDetalle Diario de la Semana Virtual (Distribucion Optimizada):\r\n";
                csvContent += "Dia;Ingesta Desayuno (ug);Absorcion Desayuno (ug);Ingesta Almuerzo (ug);Absorcion Almuerzo (ug);Ingesta Cena (ug);Absorcion Cena (ug);Total Absorbido Dia (ug);Cumple Meta?\r\n";
                resultados.reporteDias.forEach(d => {
                    const des = d.comidas[0];
                    const alm = d.comidas[1];
                    const cen = d.comidas[2];
                    csvContent += `${t(d.diaNombreKey)};${des.totalIngerido};${des.totalAbsorbido};${alm.totalIngerido};${alm.totalAbsorbido};${cen.totalIngerido};${cen.totalAbsorbido};${d.totalAbsorbidoDia};${d.cumpleMeta ? 'SI' : 'NO'}\r\n`;
                });

                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `B12_Risk_Screen_${perfil.grupoEstudio}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            };

            const exportarPDF = () => {
                window.print();
            };

            return (
                <div class="min-h-screen flex flex-col">
                    
                    {/* --- ENCABEZADO --- */}
                    <header class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-50 no-print">
                        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/20 text-white">
                                    <i class="fa-solid fa-microscope text-lg"></i>
                                </div>
                                <div>
                                    <h1 class="font-bold text-lg leading-tight text-slate-900 dark:text-white flex items-center gap-2">
                                        B12 Risk Screen
                                        <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">BREA v1.0</span>
                                    </h1>
                                    <p class="text-xs text-slate-500 dark:text-slate-400">{t('app_subtitle')}</p>
                                </div>
                            </div>
                            
                            {/* SELECTOR DE IDIOMAS Y BOTONES */}
                            <div class="flex items-center gap-3 sm:gap-4">
                                {/* Selector premium de Idiomas con Banderas Emojis */}
                                <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                                    <button onClick={() => setLang('es')} class={`px-1.5 py-0.5 text-sm rounded transition-all ${lang === 'es' ? 'bg-white dark:bg-slate-900 shadow-sm scale-105' : 'opacity-60 hover:opacity-100'}`} title="Español">🇵🇦</button>
                                    <button onClick={() => setLang('en')} class={`px-1.5 py-0.5 text-sm rounded transition-all ${lang === 'en' ? 'bg-white dark:bg-slate-900 shadow-sm scale-105' : 'opacity-60 hover:opacity-100'}`} title="English (UK)">🇬🇧</button>
                                    <button onClick={() => setLang('fi')} class={`px-1.5 py-0.5 text-sm rounded transition-all ${lang === 'fi' ? 'bg-white dark:bg-slate-900 shadow-sm scale-105' : 'opacity-60 hover:opacity-100'}`} title="Suomi">🇫🇮</button>
                                    <button onClick={() => setLang('de')} class={`px-1.5 py-0.5 text-sm rounded transition-all ${lang === 'de' ? 'bg-white dark:bg-slate-900 shadow-sm scale-105' : 'opacity-60 hover:opacity-100'}`} title="Deutsch">🇩🇪</button>
                                    <button onClick={() => setLang('it')} class={`px-1.5 py-0.5 text-sm rounded transition-all ${lang === 'it' ? 'bg-white dark:bg-slate-900 shadow-sm scale-105' : 'opacity-60 hover:opacity-100'}`} title="Italiano">🇮🇹</button>
                                    <button onClick={() => setLang('ko')} class={`px-1.5 py-0.5 text-sm rounded transition-all ${lang === 'ko' ? 'bg-white dark:bg-slate-900 shadow-sm scale-105' : 'opacity-60 hover:opacity-100'}`} title="한국어">🇰🇷</button>
                                    <button onClick={() => setLang('ja')} class={`px-1.5 py-0.5 text-sm rounded transition-all ${lang === 'ja' ? 'bg-white dark:bg-slate-900 shadow-sm scale-105' : 'opacity-60 hover:opacity-100'}`} title="日本語">🇯🇵</button>
                                </div>

                                <button 
                                    onClick={() => setDarkMode(!darkMode)}
                                    class="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                                    title="Alternar Tema"
                                >
                                    <i class={`fa-solid ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
                                </button>
                                <button 
                                    onClick={exportarPDF}
                                    class="hidden lg:flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 border border-brand-200 dark:border-brand-900"
                                >
                                    <i class="fa-solid fa-file-pdf"></i> {t('print_report')}
                                </button>
                                <button 
                                    onClick={exportarExcel}
                                    class="hidden lg:flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
                                >
                                    <i class="fa-solid fa-file-csv"></i> {t('export_csv')}
                                </button>
                            </div>
                        </div>
                    </header>

                    {/* --- CONTENIDO PRINCIPAL --- */}
                    <main class="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                        
                        {/* ADVERTENCIA DE METODOLOGÍA */}
                        <div class="mb-8 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-2xl flex items-start gap-4">
                            <div class="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg shrink-0">
                                <i class="fa-solid fa-circle-info text-lg"></i>
                            </div>
                            <div>
                                <h4 class="font-semibold text-blue-800 dark:text-blue-300 text-sm">{t('methodology_title')}</h4>
                                <p class="text-xs text-blue-700/85 dark:text-blue-400 mt-1 leading-relaxed">
                                    {t('methodology_desc')}
                                </p>
                            </div>
                        </div>

                        {/* GRID PRINCIPAL */}
                        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            
                            {/* COLUMNA IZQUIERDA: CONFIGURACIÓN E INPUTS */}
                            <section class="lg:col-span-5 flex flex-col gap-8 no-print">
                                
                                {/* CARD: IDENTIFICACIÓN DEL PATRÓN DIETÉTICO */}
                                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                                    <h3 class="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <i class="fa-solid fa-utensils text-brand-600"></i> {t('dietary_pattern')}
                                    </h3>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">{t('select_diet')}</label>
                                        <select 
                                            value={perfil.grupoEstudio}
                                            onChange={(e) => handleGrupoEstudioChange(e.target.value)}
                                            class="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold mb-4 text-slate-800 dark:text-slate-100"
                                        >
                                            <option value="Vegano">{t('diet_vegan')}</option>
                                            <option value="Ovolactovegetariano">{t('diet_ovolacto')}</option>
                                            <option value="Flexitariano">{t('diet_flexi')}</option>
                                            <option value="Omnívoro">{t('diet_omni')}</option>
                                        </select>
                                    </div>
                                </div>

                                {/* CARD: SUPLEMENTACIÓN CON CIANOCOBALAMINA */}
                                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                                    <div class="flex items-center justify-between mb-2">
                                        <h3 class="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                                            <i class="fa-solid fa-pills text-brand-600"></i> {t('supp_title')}
                                        </h3>
                                        <span class="text-[10px] bg-brand-100 dark:bg-brand-950 px-2 py-0.5 rounded text-brand-700 dark:text-brand-300 font-bold">{t('supp_active')}</span>
                                    </div>
                                    <p class="text-xs text-slate-400 dark:text-slate-500 mb-4">
                                        {t('supp_desc')}
                                    </p>
                                    
                                    <div class="space-y-4">
                                        <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('supp_regimen')}</label>
                                        <select 
                                            value={suplementacion}
                                            onChange={(e) => setSuplementacion(e.target.value)}
                                            class="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold text-slate-800 dark:text-slate-100"
                                        >
                                            <option value="ninguna">{t('supp_none')}</option>
                                            <optgroup label={t('supp_daily_group')}>
                                                <option value="1.4_3x">{t('supp_14_3x')}</option>
                                                <option value="5_1x">{t('supp_5_1x')}</option>
                                                <option value="5_2x">{t('supp_5_2x')}</option>
                                                <option value="100_1x">{t('supp_100_1x')}</option>
                                            </optgroup>
                                            <optgroup label={t('supp_weekly_group')}>
                                                <option value="1000_3x">{t('supp_1000_3x')}</option>
                                                <option value="1250_2x">{t('supp_1250_2x')}</option>
                                                <option value="2500_1x">{t('supp_2500_1x')}</option>
                                            </optgroup>
                                        </select>

                                        {/* Mensaje metodológico requerido */}
                                        <div class="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-150 dark:border-amber-900 rounded-xl text-amber-800 dark:text-amber-400 text-[11px] leading-relaxed">
                                            <i class="fa-solid fa-triangle-exclamation mr-1 shrink-0"></i>
                                            <strong>{t('clinical_note')}</strong> {t('clinical_note_desc')}
                                        </div>
                                    </div>
                                </div>

                                {/* CARD: CUESTIONARIO FFQ */}
                                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex-grow">
                                    <div class="flex items-center justify-between mb-6">
                                        <h3 class="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                                            <i class="fa-solid fa-list-check text-brand-600"></i> {t('ffq_title')}
                                        </h3>
                                        <span class="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500 dark:text-slate-400 font-semibold">{t('ffq_subtitle')}</span>
                                    </div>

                                    <div class="space-y-6">
                                        {alimentosFiltrados.map(al => {
                                            return (
                                                <div key={al.id} class="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-900/60 hover:border-slate-200 dark:hover:border-slate-800 transition-all">
                                                    
                                                    {/* Header Alimento (Aporte fijo de microgramos) */}
                                                    <div class="flex items-center justify-between mb-3">
                                                        <div class="flex items-center gap-2">
                                                            <div class="w-7 h-7 rounded-lg bg-brand-100 dark:bg-brand-950/50 flex items-center justify-center text-brand-600 dark:text-brand-400">
                                                                <i class={al.icono}></i>
                                                            </div>
                                                            <div>
                                                                <h4 class="font-bold text-sm text-slate-800 dark:text-slate-200 leading-tight">{t(al.nombreKey)}</h4>
                                                                <p class="text-[10px] text-slate-400 mt-0.5">{t('ffq_portion')} {t(al.porcionUnidadKey)}</p>
                                                            </div>
                                                        </div>
                                                        
                                                        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 px-2.5 py-1 rounded-lg text-xs font-bold text-brand-600 dark:text-brand-400" title="Contenido de B12 inalterable">
                                                            {al.b12Porporcion} µg
                                                        </div>
                                                    </div>

                                                    {/* Selectores de consumo */}
                                                    <div class={`grid gap-3 pt-2 border-t border-slate-200/40 dark:border-slate-900/40 ${al.permitePorciones ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                                        <div>
                                                            <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t('ffq_days_week')}</label>
                                                            <select 
                                                                value={al.diasPorSemana}
                                                                onChange={(e) => handleAlimentoChange(al.id, 'diasPorSemana', parseInt(e.target.value))}
                                                                class="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-800 dark:text-slate-100"
                                                            >
                                                                {[0, 1, 2, 3, 4, 5, 6, 7].map(d => (
                                                                    <option key={d} value={d}>{d === 0 ? t('ffq_no_consume') : `${d} ${d === 1 ? t('ffq_day') : t('ffq_days')}`}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t('ffq_times_day')}</label>
                                                            <select 
                                                                value={al.vecesPorDia}
                                                                onChange={(e) => handleAlimentoChange(al.id, 'vecesPorDia', parseInt(e.target.value))}
                                                                class="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-800 dark:text-slate-100"
                                                                disabled={al.diasPorSemana === 0}
                                                            >
                                                                <option value={1}>{`1 ${t('ffq_time')}`}</option>
                                                                <option value={2}>{`2 ${t('ffq_times')}`}</option>
                                                                <option value={3}>{`3 ${t('ffq_times')}`}</option>
                                                            </select>
                                                        </div>
                                                        
                                                        {/* Visualización condicional de la porción */}
                                                        {al.permitePorciones && (
                                                            <div>
                                                                <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t('ffq_portions')}</label>
                                                                <select 
                                                                    value={al.porcionesPorComida}
                                                                    onChange={(e) => handleAlimentoChange(al.id, 'porcionesPorComida', parseFloat(e.target.value))}
                                                                    class="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-800 dark:text-slate-100"
                                                                    disabled={al.diasPorSemana === 0}
                                                                >
                                                                    {Array.from({ length: al.maxPorciones }, (_, i) => i + 1).map(p => (
                                                                        <option key={p} value={p}>{p} {p === 1 ? t('ffq_portion_unit') : t('ffq_portions_unit')}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        )}
                                                    </div>

                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </section>

                            {/* COLUMNA DERECHA: RESULTADOS */}
                            <section class="lg:col-span-7 flex flex-col gap-8">
                                
                                {/* DASHBOARD DE LOGROS / METRICAS */}
                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    
                                    {/* CARD 1: % CUMPLIMIENTO */}
                                    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
                                        <div class="absolute -right-6 -bottom-6 text-brand-100 dark:text-brand-900/10 text-8xl pointer-events-none font-bold">
                                            %
                                        </div>
                                        <div>
                                            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('metrics_compliance')}</span>
                                            <h2 class="text-4xl font-extrabold text-slate-800 dark:text-white mt-2">{resultados.porcentajeCumplimiento}%</h2>
                                        </div>
                                        <div class="mt-4">
                                            <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                                <div 
                                                    class="bg-brand-500 h-2 rounded-full transition-all duration-500" 
                                                    style={{ width: `${resultados.porcentajeCumplimiento}%` }}
                                                ></div>
                                            </div>
                                            <p class="text-[10px] text-slate-500 mt-1.5">{t('metrics_target')}</p>
                                        </div>
                                    </div>

                                    {/* CARD 2: RECUENTO DÍAS */}
                                    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                                        <div>
                                            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('metrics_days_title')}</span>
                                            <div class="flex items-baseline gap-1 mt-2">
                                                <span class="text-4xl font-extrabold text-emerald-500">{resultados.diasCumplidos}</span>
                                                <span class="text-sm font-semibold text-slate-400">{t('metrics_days_subtitle')}</span>
                                            </div>
                                        </div>
                                        <div class="mt-4 flex gap-1.5">
                                            {resultados.reporteDias.map((d, idx) => (
                                                <div 
                                                    key={idx} 
                                                    title={`${t(d.diaNombreKey)}`}
                                                    class={`flex-1 h-3 rounded-full ${d.cumpleMeta ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`}
                                                ></div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* CARD 3: ABSORCION PROMEDIO */}
                                    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                                        <div>
                                            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('metrics_absorption_title')}</span>
                                            <h2 class="text-4xl font-extrabold text-slate-800 dark:text-white mt-2">{resultados.promedioAbsorbidoSemanal} <span class="text-lg font-semibold">µg/d</span></h2>
                                        </div>
                                        <div class="mt-4">
                                            <p class="text-[11px] text-slate-500 leading-relaxed">
                                                {t('metrics_absorption_subtitle')}
                                            </p>
                                        </div>
                                    </div>

                                </div>

                                {/* CARD DIAGNÓSTICO BREA v1.0 */}
                                <div class={`border p-6 rounded-2xl ${infoRiesgo.color} transition-all duration-300`}>
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-full bg-white/40 dark:bg-black/20 flex items-center justify-center">
                                            <i class="fa-solid fa-triangle-exclamation text-base"></i>
                                        </div>
                                        <div>
                                            <span class="text-xs font-bold uppercase tracking-wider opacity-75">{t('diagnostic_title')}</span>
                                            <h3 class="text-lg font-bold leading-none mt-1">{infoRiesgo.clasificacion}</h3>
                                        </div>
                                    </div>
                                    <p class="text-xs mt-3 leading-relaxed opacity-90">{infoRiesgo.descripcion}</p>
                                    <div class="mt-4 pt-3 border-t border-current/10 flex justify-between text-xs font-bold">
                                        <span>{t('diagnostic_severity')}</span>
                                        <span class="underline uppercase tracking-wide">{infoRiesgo.severidad}</span>
                                    </div>
                                </div>

                                {/* VISTA DE LA SEMANA VIRTUAL RECONSTRUIDA */}
                                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                                    <div class="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 class="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                                                <i class="fa-solid fa-calendar-week text-brand-600"></i> {t('week_reconstructed_title')}
                                            </h3>
                                            <p class="text-[10px] text-slate-400 mt-1">{t('week_reconstructed_desc')}</p>
                                        </div>
                                        <span class="text-xs text-slate-400 shrink-0">{t('week_simulation_tag')}</span>
                                    </div>
                                    
                                    <div class="grid grid-cols-1 gap-3">
                                        {resultados.reporteDias.map((d, dIdx) => (
                                            <div 
                                                key={dIdx} 
                                                class={`p-4 rounded-xl border ${d.cumpleMeta ? 'bg-white dark:bg-slate-900 border-emerald-500/30 font-medium' : 'bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-850'} transition-all`}
                                            >
                                                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                                    <div class="flex items-center gap-2">
                                                        <span class={`w-2.5 h-2.5 rounded-full ${d.cumpleMeta ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}></span>
                                                        <span class="font-bold text-sm text-slate-800 dark:text-slate-200">{t(d.diaNombreKey)}</span>
                                                    </div>
                                                    <div class="flex items-center gap-4 text-xs font-semibold">
                                                        <span class="text-slate-500 dark:text-slate-400">{t('week_total_ingested')} <strong class="text-slate-700 dark:text-slate-300">{Math.round(d.totalIngeridoDia * 10) / 10} µg</strong></span>
                                                        <span class="text-brand-600 dark:text-brand-400">{t('week_realized_abs')} <strong>{Math.round(d.totalAbsorbidoDia * 10) / 10} µg</strong></span>
                                                    </div>
                                                </div>

                                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    {d.comidas.map((c, cIdx) => (
                                                        <div key={cIdx} class="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800/80">
                                                            <div class="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase mb-1.5 border-b border-slate-100 dark:border-slate-800/40 pb-1">
                                                                <span>{t(c.nombreKey)}</span>
                                                                <span class="text-brand-600 dark:text-brand-400">Abs: {c.totalAbsorbido}µg</span>
                                                            </div>
                                                            {c.alimentosConsumidos.length > 0 || c.suplemento ? (
                                                                <ul class="space-y-1">
                                                                    {c.suplemento && (
                                                                        <li class="text-[10px] flex justify-between items-center bg-teal-50 dark:bg-teal-950/50 p-1 rounded border border-teal-500/20 text-teal-800 dark:text-teal-300 font-bold">
                                                                            <span class="truncate pr-1"><i class="fa-solid fa-pills mr-1"></i>{t('suplemento_lbl')} ({c.suplemento.etiqueta})</span>
                                                                            <span class="shrink-0">{c.suplemento.dosis}µg</span>
                                                                        </li>
                                                                    )}
                                                                    {c.alimentosConsumidos.map((al, alIdx) => (
                                                                        <li key={alIdx} class="text-[10px] flex justify-between items-center bg-slate-50 dark:bg-slate-950/50 p-1 rounded">
                                                                            <span class="truncate pr-1 font-medium">{t(al.nombreKey)}</span>
                                                                            <span class="font-bold shrink-0">{al.b12Ingerida}µg</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            ) : (
                                                                <p class="text-[10px] text-slate-300 dark:text-slate-700 italic py-1">{t('week_no_events')}</p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </section>

                        </div>

                        {/* SECCIÓN: INTERPRETACIÓN DE RESULTADOS DE LABORATORIO */}
                        {(() => {
                            // Lógica de clasificación del resultado de laboratorio
                            const valorNum = parseFloat(labValor);
                            let labClasificacion = null;
                            let labColor = '';
                            let labIcono = '';
                            let labTitulo = '';
                            let labDescripcion = '';
                            let mostrarMarcador = false;
                            let resultadoFinal = null;

                            if (!isNaN(valorNum) && valorNum > 0) {
                                let esNormal, esBajaNormal, esBaja;
                                if (labUnidad === 'pgml') {
                                    esNormal    = valorNum > 542;
                                    esBajaNormal = valorNum >= 271 && valorNum <= 542;
                                    esBaja      = valorNum < 271;
                                } else {
                                    esNormal    = valorNum > 400;
                                    esBajaNormal = valorNum >= 200 && valorNum <= 400;
                                    esBaja      = valorNum < 200;
                                }

                                if (esNormal) {
                                    labClasificacion = 'normal';
                                    labColor = 'emerald';
                                    labIcono = 'fa-circle-check';
                                    labTitulo = 'Normal — Sin Deficiencia';
                                    labDescripcion = 'Los niveles de vitamina B12 en sangre se encuentran dentro del rango de normalidad. No se evidencia deficiencia sérica.';
                                } else if (esBajaNormal) {
                                    labClasificacion = 'baja-normal';
                                    labColor = 'amber';
                                    labIcono = 'fa-triangle-exclamation';
                                    labTitulo = 'Baja-Normal — Zona de Incertidumbre';
                                    labDescripcion = 'El valor se encuentra en zona gris. Se requiere un marcador funcional para determinar si existe deficiencia metabólica real.';
                                    mostrarMarcador = true;
                                } else if (esBaja) {
                                    labClasificacion = 'baja';
                                    labColor = 'rose';
                                    labIcono = 'fa-circle-xmark';
                                    labTitulo = 'Baja — Deficiencia';
                                    labDescripcion = 'Los niveles de vitamina B12 son insuficientes. Se confirma deficiencia sérica. Se recomienda evaluación clínica y considerar suplementación o tratamiento.';
                                }

                                // Resultado final si hay marcador funcional completado
                                if (esBajaNormal && labMarcador && labMarcadorResultado) {
                                    if (labMarcadorResultado === 'normal') {
                                        resultadoFinal = { tipo: 'sin-deficiencia', color: 'emerald', icono: 'fa-circle-check', texto: 'Sin Deficiencia Funcional', desc: `El marcador funcional (${labMarcador === 'homocisteina' ? 'Homocisteína' : 'Ácido Metilmalónico'}) está dentro de la normalidad. A pesar del nivel sérico bajo-normal, no se confirma deficiencia metabólica activa.` };
                                    } else {
                                        resultadoFinal = { tipo: 'deficiencia', color: 'rose', icono: 'fa-circle-xmark', texto: 'Deficiencia Funcional Confirmada', desc: `El marcador funcional (${labMarcador === 'homocisteina' ? 'Homocisteína' : 'Ácido Metilmalónico'}) está elevado. Esto confirma deficiencia metabólica de vitamina B12 a nivel tisular. Se recomienda evaluación clínica inmediata.` };
                                    }
                                }
                            }

                            return (
                                <div class="mt-10 no-print">
                                    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                                        
                                        {/* Encabezado */}
                                        <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                                            <div class="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                                                <i class="fa-solid fa-flask-vial text-base"></i>
                                            </div>
                                            <div>
                                                <h2 class="font-bold text-slate-900 dark:text-slate-100 text-sm">Interpretación de Resultados de Laboratorio — Vitamina B12 Sérica</h2>
                                                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ingresa el valor de tu análisis clínico para conocer su clasificación e interpretación</p>
                                            </div>
                                        </div>

                                        <div class="p-6 space-y-6">

                                            {/* Tabla de referencia */}
                                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                                <div class="flex items-start gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl">
                                                    <i class="fa-solid fa-circle-check text-emerald-500 mt-0.5 shrink-0"></i>
                                                    <div>
                                                        <p class="font-bold text-emerald-700 dark:text-emerald-300">Normal</p>
                                                        <p class="text-emerald-600 dark:text-emerald-400 mt-0.5">&gt;542 pg/ml &nbsp;|&nbsp; &gt;400 pmol/l</p>
                                                        <p class="text-emerald-600/80 dark:text-emerald-500 mt-0.5">Sin deficiencia</p>
                                                    </div>
                                                </div>
                                                <div class="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl">
                                                    <i class="fa-solid fa-triangle-exclamation text-amber-500 mt-0.5 shrink-0"></i>
                                                    <div>
                                                        <p class="font-bold text-amber-700 dark:text-amber-300">Baja-Normal</p>
                                                        <p class="text-amber-600 dark:text-amber-400 mt-0.5">271–542 pg/ml &nbsp;|&nbsp; 200–400 pmol/l</p>
                                                        <p class="text-amber-600/80 dark:text-amber-500 mt-0.5">Requiere marcador funcional</p>
                                                    </div>
                                                </div>
                                                <div class="flex items-start gap-2 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl">
                                                    <i class="fa-solid fa-circle-xmark text-rose-500 mt-0.5 shrink-0"></i>
                                                    <div>
                                                        <p class="font-bold text-rose-700 dark:text-rose-300">Baja</p>
                                                        <p class="text-rose-600 dark:text-rose-400 mt-0.5">&lt;271 pg/ml &nbsp;|&nbsp; &lt;200 pmol/l</p>
                                                        <p class="text-rose-600/80 dark:text-rose-500 mt-0.5">Deficiencia confirmada</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Inputs */}
                                            <div class="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                                                <div class="flex-1 w-full">
                                                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Valor del resultado</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="any"
                                                        value={labValor}
                                                        onChange={e => { setLabValor(e.target.value); setLabMarcador(''); setLabMarcadorResultado(''); }}
                                                        placeholder="Ej: 350"
                                                        class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 dark:focus:ring-violet-600"
                                                    />
                                                </div>
                                                <div>
                                                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Unidad</label>
                                                    <div class="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 text-sm font-medium">
                                                        <button
                                                            onClick={() => { setLabUnidad('pgml'); setLabMarcador(''); setLabMarcadorResultado(''); }}
                                                            class={`px-4 py-2.5 transition-colors ${labUnidad === 'pgml' ? 'bg-violet-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                                        >pg/ml</button>
                                                        <button
                                                            onClick={() => { setLabUnidad('pmoll'); setLabMarcador(''); setLabMarcadorResultado(''); }}
                                                            class={`px-4 py-2.5 transition-colors border-l border-slate-200 dark:border-slate-700 ${labUnidad === 'pmoll' ? 'bg-violet-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                                        >pmol/l</button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Resultado de clasificación */}
                                            {labClasificacion && (
                                                <div class={`flex items-start gap-3 p-4 rounded-xl border bg-${labColor}-50 dark:bg-${labColor}-950/20 border-${labColor}-200 dark:border-${labColor}-900`}>
                                                    <i class={`fa-solid ${labIcono} text-${labColor}-500 text-xl mt-0.5 shrink-0`}></i>
                                                    <div>
                                                        <p class={`font-bold text-${labColor}-700 dark:text-${labColor}-300 text-sm`}>{labTitulo}</p>
                                                        <p class={`text-xs text-${labColor}-600 dark:text-${labColor}-400 mt-1 leading-relaxed`}>{labDescripcion}</p>
                                                        <p class={`text-xs text-${labColor}-500 dark:text-${labColor}-500 mt-1 font-mono`}>
                                                            Valor ingresado: <strong>{valorNum} {labUnidad === 'pgml' ? 'pg/ml' : 'pmol/l'}</strong>
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Bloque marcador funcional — solo si es baja-normal */}
                                            {mostrarMarcador && (
                                                <div class="p-5 bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900 rounded-2xl space-y-4">
                                                    <div class="flex items-center gap-2">
                                                        <i class="fa-solid fa-vials text-amber-600 dark:text-amber-400"></i>
                                                        <p class="font-bold text-amber-800 dark:text-amber-300 text-sm">Se requiere marcador funcional</p>
                                                    </div>
                                                    <p class="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                                                        El nivel sérico Baja-Normal no es concluyente por sí solo. Para determinar si existe deficiencia metabólica real, se recomienda solicitar uno de los siguientes marcadores funcionales:
                                                    </p>

                                                    {/* Selección del marcador */}
                                                    <div>
                                                        <label class="block text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">¿Qué marcador funcional se solicitó?</label>
                                                        <div class="flex flex-col sm:flex-row gap-2">
                                                            <button
                                                                onClick={() => { setLabMarcador('homocisteina'); setLabMarcadorResultado(''); }}
                                                                class={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${labMarcador === 'homocisteina' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30'}`}
                                                            >
                                                                <i class="fa-solid fa-dna mr-1.5"></i> Homocisteína
                                                            </button>
                                                            <button
                                                                onClick={() => { setLabMarcador('amd'); setLabMarcadorResultado(''); }}
                                                                class={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${labMarcador === 'amd' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30'}`}
                                                            >
                                                                <i class="fa-solid fa-atom mr-1.5"></i> Ácido Metilmalónico
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Resultado del marcador */}
                                                    {labMarcador && (
                                                        <div>
                                                            <label class="block text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">
                                                                Resultado de {labMarcador === 'homocisteina' ? 'Homocisteína' : 'Ácido Metilmalónico'}:
                                                            </label>
                                                            <div class="flex flex-col sm:flex-row gap-2">
                                                                <button
                                                                    onClick={() => setLabMarcadorResultado('normal')}
                                                                    class={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${labMarcadorResultado === 'normal' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'}`}
                                                                >
                                                                    <i class="fa-solid fa-circle-check mr-1.5"></i> Normal (Sin deficiencia)
                                                                </button>
                                                                <button
                                                                    onClick={() => setLabMarcadorResultado('elevado')}
                                                                    class={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${labMarcadorResultado === 'elevado' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/30'}`}
                                                                >
                                                                    <i class="fa-solid fa-arrow-trend-up mr-1.5"></i> Elevado (Deficiencia)
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Resultado final con marcador */}
                                                    {resultadoFinal && (
                                                        <div class={`flex items-start gap-3 p-4 rounded-xl border bg-${resultadoFinal.color}-50 dark:bg-${resultadoFinal.color}-950/20 border-${resultadoFinal.color}-200 dark:border-${resultadoFinal.color}-900 mt-2`}>
                                                            <i class={`fa-solid ${resultadoFinal.icono} text-${resultadoFinal.color}-500 text-xl mt-0.5 shrink-0`}></i>
                                                            <div>
                                                                <p class={`font-bold text-${resultadoFinal.color}-700 dark:text-${resultadoFinal.color}-300 text-sm`}>{resultadoFinal.texto}</p>
                                                                <p class={`text-xs text-${resultadoFinal.color}-600 dark:text-${resultadoFinal.color}-400 mt-1 leading-relaxed`}>{resultadoFinal.desc}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Botón reset */}
                                            {labValor && (
                                                <div class="flex justify-end">
                                                    <button
                                                        onClick={() => { setLabValor(''); setLabMarcador(''); setLabMarcadorResultado(''); }}
                                                        class="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1.5 transition-colors"
                                                    >
                                                        <i class="fa-solid fa-rotate-left"></i> Limpiar resultado
                                                    </button>
                                                </div>
                                            )}

                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* SECCIÓN EXCLUSIVA PARA IMPRESIÓN REPORT / PDF */}
                        <div class="hidden print-only mt-12 p-8 border border-slate-300 rounded-3xl bg-white text-slate-900 space-y-6">
                            <div class="text-center pb-6 border-b border-slate-200">
                                <h1 class="text-2xl font-extrabold text-slate-900">B12 Risk Screen</h1>
                                <p class="text-sm text-slate-500">{t('app_subtitle')}</p>
                            </div>
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div><strong>{t('pdf_author_tag')}</strong> MEd Jean Carlos Ruiz Mosley</div>
                                <div><strong>{t('pdf_evaluated_pattern')}</strong> {t(`diet_${perfil.grupoEstudio.toLowerCase()}`)}</div>
                                <div><strong>{t('pdf_supp_tag')}</strong> {suplementacion === 'ninguna' ? t('supp_none') : suplementacion}</div>
                                <div><strong>{t('pdf_date_tag')}</strong> {new Date().toLocaleDateString('es-ES')}</div>
                                <div><strong>{t('pdf_evaluator_tag')}</strong></div>
                            </div>
                            <div class="pt-4 border-t border-slate-200 space-y-3">
                                <h2 class="text-lg font-bold">{t('pdf_results_summary')}</h2>
                                <ul class="space-y-1 text-sm">
                                    <li>• {t('pdf_bullet_1').replace('{val}', resultados.promedioAbsorbidoSemanal)}</li>
                                    <li>• {t('pdf_bullet_2').replace('{val1}', resultados.diasCumplidos).replace('{val2}', resultados.porcentajeCumplimiento)}</li>
                                    <li>• {t('pdf_bullet_3').replace('{val1}', infoRiesgo.clasificacion).replace('{val2}', infoRiesgo.severidad)}</li>
                                </ul>
                            </div>
                            <p class="pt-4 border-t border-slate-200 text-[10px] text-slate-400 text-center">
                                © 2026 Jean Carlos Ruiz Mosley. Todos los derechos reservados. B12 Risk Screen (BREA v1.0).
                            </p>
                        </div>

                    </main>

                    {/* --- PIE DE PÁGINA --- */}
                    <footer class="bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 py-8 text-xs text-slate-500 dark:text-slate-400 no-print">
                        <div class="max-w-7xl mx-auto px-4">
                            
                            <div class="text-left max-w-xl space-y-1">
                                <p class="font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider text-[10px]">{t('footer_author')}</p>
                                <p class="font-bold text-brand-600 dark:text-brand-400 text-sm">MEd Jean Carlos Ruiz Mosley</p>
                                <p class="text-slate-600 dark:text-slate-300 leading-relaxed">{t('footer_specialist')}</p>
                                <p class="text-[10px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 mt-2">
                                    {t('footer_license_panama')}
                                </p>
                                <p class="text-[10px] text-slate-400 dark:text-slate-500 pt-2">
                                    {t('footer_simulation_tag')}
                                </p>
                            </div>
                        </div>
                    </footer>

                </div>
            );
        }

// Renderizar la app React en el DOM
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
