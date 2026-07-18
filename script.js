class PlotGridApp {
    constructor() {
        this.currentFile = null;
        this.autoSaveEnabled = true;
        this.saveTimeout = null;
        this.actsCollapsed = {}; // Ahora es un objeto por acto
        
        this.toolbarCollapsed = localStorage.getItem('pg-toolbar-collapsed') === 'true';
        this.sizeControlsCollapsed = localStorage.getItem('pg-size-controls-collapsed') === 'true';
        
        this.state = {
            acts: [],
            plots: [],
            plotGroups: [],
            characters: [],
            chapters: [],
            hitos: [],
            scenes: [],
            assignments: {},
            settings: {
                theme: localStorage.getItem('pg-theme') || 'light',
                accentColor: localStorage.getItem('pg-accent') || '#d4a373',
                font: localStorage.getItem('pg-font') || "'Inter', sans-serif",
                compactMode: localStorage.getItem('pg-compact') === 'true',
                cellWidth: parseInt(localStorage.getItem('pg-cell-width') || '220'),
                cellHeight: parseInt(localStorage.getItem('pg-cell-height') || '350'),
                colorIntensity: parseInt(localStorage.getItem('pg-color-intensity') || '60'),
                groupByType: localStorage.getItem('pg-group-by-type') === 'true',
                zoom: parseFloat(localStorage.getItem('pg-zoom') || '1')
            },
            metadata: {
                lastModified: new Date().toISOString(),
                version: '1.0'
            }
        };
        this.init();
    }

    init() {
        this.loadFromLocalStorage();
        this.migrateOldData();
        this.loadActsCollapsedState();
        this.applySettings();
        if (this.state.acts.length === 0) {
            this.loadInitialData();
        }
        if (this.state.plotGroups.length === 0) {
            this.initPlotGroups();
        }
        if (this.state.characters.length === 0) {
            this.initCharacters();
        }
        this.render();
        this.setupGlobalDragAndDrop();
        this.setupAutoSave();
        this.setupResizeHandlers();
        this.updateFileInfo();
        this.applyCollapseStates();
    }

    loadActsCollapsedState() {
        const saved = localStorage.getItem('pg-acts-collapsed-state');
        if (saved) {
            try {
                this.actsCollapsed = JSON.parse(saved);
            } catch(e) {
                this.actsCollapsed = {};
            }
        }
        
        // Inicializar estado para cada acto
        this.state.acts.forEach(act => {
            if (!(act.id in this.actsCollapsed)) {
                this.actsCollapsed[act.id] = false;
            }
        });
    }

    saveActsCollapsedState() {
        localStorage.setItem('pg-acts-collapsed-state', JSON.stringify(this.actsCollapsed));
    }

    migrateOldData() {
        let migrated = false;
        
        // Migrar actsCollapsed global a por acto
        if (localStorage.getItem('pg-acts-collapsed') === 'true' && !localStorage.getItem('pg-acts-collapsed-state')) {
            this.actsCollapsed = {};
            this.state.acts.forEach(act => {
                this.actsCollapsed[act.id] = true;
            });
            localStorage.removeItem('pg-acts-collapsed');
            this.saveActsCollapsedState();
        }
        
        if (!this.state.plotGroups) {
            this.state.plotGroups = [];
            migrated = true;
        }
        if (this.state.plotGroups.length === 0) {
            this.initPlotGroups();
            migrated = true;
        }
        
        if (!this.state.characters) {
            this.state.characters = [];
            migrated = true;
        }
        if (this.state.characters.length === 0) {
            this.initCharacters();
            migrated = true;
        }
        
        if (this.state.plots) {
            this.state.plots.forEach(plot => {
                if (!plot.type) {
                    plot.type = 'story';
                    plot.groupId = 'group-story';
                    migrated = true;
                }
                if (!plot.characterIds) {
                    plot.characterIds = [];
                    migrated = true;
                }
            });
        }
        
        if (this.state.hitos) {
            this.state.hitos.forEach(hito => {
                if (!hito.color && hito.plotId) {
                    const plot = this.state.plots.find(p => p.id === hito.plotId);
                    hito.color = plot ? plot.color : '#d4a373';
                    migrated = true;
                }
            });
        }
        
        if (migrated) {
            console.log('✅ Datos migrados al nuevo formato');
            this.saveToLocalStorage();
        }
    }

    initPlotGroups() {
        this.state.plotGroups = [
            { id: 'group-story', name: '📖 TRAMAS DE HISTORIA', type: 'story', expanded: true }
        ];
    }

    initCharacters() {
        this.state.characters = [
            { id: 'char1', name: 'Alan', color: '#e06c75' },
            { id: 'char2', name: 'Elena', color: '#61afef' },
            { id: 'char3', name: 'Carlos', color: '#98c379' }
        ];
    }

    applyCollapseStates() {
        const toolbarContainer = document.getElementById('toolbar-container');
        const toggleToolbarBtn = document.getElementById('toggleToolbarBtn');
        
        if (toolbarContainer && this.toolbarCollapsed) {
            toolbarContainer.classList.add('collapsed');
            if (toggleToolbarBtn) {
                toggleToolbarBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
            }
        }
        
        const sizeControls = document.getElementById('size-controls');
        const toggleSizeBtn = document.getElementById('toggleSizeBtn');
        
        if (sizeControls && this.sizeControlsCollapsed) {
            sizeControls.classList.add('collapsed');
            if (toggleSizeBtn) {
                toggleSizeBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
            }
        }
    }

    toggleToolbar() {
        const toolbarContainer = document.getElementById('toolbar-container');
        const toggleBtn = document.getElementById('toggleToolbarBtn');
        
        if (toolbarContainer) {
            this.toolbarCollapsed = !this.toolbarCollapsed;
            localStorage.setItem('pg-toolbar-collapsed', this.toolbarCollapsed);
            
            if (this.toolbarCollapsed) {
                toolbarContainer.classList.add('collapsed');
                if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
            } else {
                toolbarContainer.classList.remove('collapsed');
                if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
            }
        }
    }

    toggleSizeControls() {
        const sizeControls = document.getElementById('size-controls');
        const toggleBtn = document.getElementById('toggleSizeBtn');
        
        if (sizeControls) {
            this.sizeControlsCollapsed = !this.sizeControlsCollapsed;
            localStorage.setItem('pg-size-controls-collapsed', this.sizeControlsCollapsed);
            
            if (this.sizeControlsCollapsed) {
                sizeControls.classList.add('collapsed');
                if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
            } else {
                sizeControls.classList.remove('collapsed');
                if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
            }
        }
    }

    toggleGroupByType() {
        this.state.settings.groupByType = !this.state.settings.groupByType;
        localStorage.setItem('pg-group-by-type', this.state.settings.groupByType);
        this.render();
        this.showNotification(this.state.settings.groupByType ? 'Agrupación por tipo activada' : 'Vista plana', 'info');
    }

    // NUEVO: Colapsar acto individual desde el panel
    toggleActCollapsePanel(actId) {
        if (!(actId in this.actsCollapsed)) {
            this.actsCollapsed[actId] = false;
        }
        this.actsCollapsed[actId] = !this.actsCollapsed[actId];
        this.saveActsCollapsedState();
        this.render();
        
        const act = this.state.acts.find(a => a.id === actId);
        const actName = act ? act.name : 'Acto';
        this.showNotification(
            this.actsCollapsed[actId] ? `"${actName}" comprimido` : `"${actName}" expandido`,
            'info'
        );
    }

    // NUEVO: Colapsar acto individual desde la cuadrícula
    toggleActCollapseGrid(actId) {
        if (!(actId in this.actsCollapsed)) {
            this.actsCollapsed[actId] = false;
        }
        this.actsCollapsed[actId] = !this.actsCollapsed[actId];
        this.saveActsCollapsedState();
        this.render();
        
        const act = this.state.acts.find(a => a.id === actId);
        const actName = act ? act.name : 'Acto';
        this.showNotification(
            this.actsCollapsed[actId] ? `"${actName}" comprimido` : `"${actName}" expandido`,
            'info'
        );
    }

    updateZoom(value) {
        const grid = document.getElementById('plot-grid');
        if (grid) {
            const zoom = parseFloat(value);
            this.state.settings.zoom = zoom;
            localStorage.setItem('pg-zoom', zoom);
            grid.style.transform = `scale(${zoom})`;
            grid.style.transformOrigin = 'top left';
            const wrapper = document.querySelector('.grid-wrapper');
            if (wrapper) {
                wrapper.style.overflow = 'auto';
            }
        }
    }

    setupResizeHandlers() {
        const widthSlider = document.getElementById('cell-width-slider');
        const heightSlider = document.getElementById('cell-height-slider');
        const intensitySlider = document.getElementById('color-intensity-slider');
        const widthValue = document.getElementById('width-value');
        const heightValue = document.getElementById('height-value');
        const intensityValue = document.getElementById('intensity-value');
        
        if (widthSlider) {
            widthSlider.value = this.state.settings.cellWidth;
            if (widthValue) widthValue.textContent = this.state.settings.cellWidth + 'px';
            widthSlider.oninput = (e) => {
                const val = e.target.value;
                if (widthValue) widthValue.textContent = val + 'px';
                this.state.settings.cellWidth = parseInt(val);
                localStorage.setItem('pg-cell-width', val);
                this.applyCellSizes();
                this.autoSave();
            };
        }
        
        if (heightSlider) {
            heightSlider.value = this.state.settings.cellHeight;
            if (heightValue) heightValue.textContent = this.state.settings.cellHeight + 'px';
            heightSlider.oninput = (e) => {
                const val = e.target.value;
                if (heightValue) heightValue.textContent = val + 'px';
                this.state.settings.cellHeight = parseInt(val);
                localStorage.setItem('pg-cell-height', val);
                this.applyCellSizes();
                this.autoSave();
            };
        }
        
        if (intensitySlider) {
            intensitySlider.value = this.state.settings.colorIntensity;
            if (intensityValue) intensityValue.textContent = this.state.settings.colorIntensity + '%';
            intensitySlider.oninput = (e) => {
                const val = e.target.value;
                if (intensityValue) intensityValue.textContent = val + '%';
                this.state.settings.colorIntensity = parseInt(val);
                localStorage.setItem('pg-color-intensity', val);
                this.applyColumnColors();
                this.autoSave();
            };
        }
        
        const resetBtn = document.getElementById('reset-size-btn');
        if (resetBtn) {
            resetBtn.onclick = () => {
                this.state.settings.cellWidth = 220;
                this.state.settings.cellHeight = 350;
                this.state.settings.colorIntensity = 60;
                localStorage.setItem('pg-cell-width', '220');
                localStorage.setItem('pg-cell-height', '350');
                localStorage.setItem('pg-color-intensity', '60');
                if (widthSlider) {
                    widthSlider.value = 220;
                    if (widthValue) widthValue.textContent = '220px';
                }
                if (heightSlider) {
                    heightSlider.value = 350;
                    if (heightValue) heightValue.textContent = '350px';
                }
                if (intensitySlider) {
                    intensitySlider.value = 60;
                    if (intensityValue) intensityValue.textContent = '60%';
                }
                this.applyCellSizes();
                this.applyColumnColors();
                this.autoSave();
            };
        }
    }

    applyCellSizes() {
        const grid = document.getElementById('plot-grid');
        if (!grid) return;
        
        const isCompact = this.state.settings.compactMode;
        const cellHeight = this.state.settings.cellHeight;
        
        const dataCells = document.querySelectorAll('.grid-cell:not(.plot-header)');
        dataCells.forEach(cell => {
            cell.style.maxHeight = cellHeight + 'px';
            cell.style.minHeight = cellHeight + 'px';
            if (isCompact) {
                cell.style.padding = '6px';
            } else {
                cell.style.padding = '10px';
            }
        });
        
        const headers = document.querySelectorAll('.plot-header');
        headers.forEach(header => {
            header.style.height = 'auto';
            header.style.minHeight = '50px';
        });
    }

    applyColumnColors() {
        const intensity = this.state.settings.colorIntensity / 100;
        
        this.state.plots.forEach((plot, plotIndex) => {
            const rgb = this.hexToRgb(plot.color);
            if (rgb) {
                const bgOpacity = intensity * 0.2;
                const bgColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${bgOpacity})`;
                
                const headers = document.querySelectorAll('.plot-header');
                if (headers[plotIndex]) {
                    headers[plotIndex].style.backgroundColor = bgColor;
                    headers[plotIndex].style.borderBottom = `2px solid ${plot.color}`;
                }
                
                const cells = document.querySelectorAll(`.grid-cell[data-plot-column="${plotIndex}"]`);
                cells.forEach(cell => {
                    cell.style.backgroundColor = bgColor;
                    cell.style.borderLeft = `3px solid ${plot.color}`;
                });
            }
        });
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    updatePlotColor(plotId, color) {
        const plot = this.state.plots.find(p => p.id === plotId);
        if (plot) {
            plot.color = color;
            this.state.hitos.forEach(h => {
                if (h.plotId === plotId) h.color = color;
            });
            this.render();
            this.autoSave();
        }
    }

    setupAutoSave() {
        setInterval(() => {
            if (this.autoSaveEnabled) {
                this.saveToLocalStorage();
                this.showAutoSaveNotification();
            }
        }, 30000);
        
        window.addEventListener('beforeunload', () => {
            this.saveToLocalStorage();
            this.saveActsCollapsedState();
        });
    }

    saveToLocalStorage() {
        const saveData = {
            state: this.state,
            lastSaved: new Date().toISOString(),
            fileName: this.currentFile
        };
        localStorage.setItem('plotgrid_autosave', JSON.stringify(saveData));
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('plotgrid_autosave');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.state = parsed.state;
                this.currentFile = parsed.fileName || null;
                if (!this.state.settings) {
                    this.state.settings = {
                        theme: 'light',
                        accentColor: '#d4a373',
                        font: "'Inter', sans-serif",
                        compactMode: false,
                        cellWidth: 220,
                        cellHeight: 350,
                        colorIntensity: 60,
                        groupByType: false,
                        zoom: 1
                    };
                }
                if (!this.state.plotGroups) this.state.plotGroups = [];
                if (!this.state.characters) this.state.characters = [];
                console.log('Auto-guardado local cargado');
            } catch(e) {
                console.error('Error cargando auto-guardado:', e);
            }
        }
    }

    showAutoSaveNotification() {
        const statusSpan = document.getElementById('auto-save-status');
        if (statusSpan) {
            statusSpan.innerHTML = '● Auto-guardado ✓';
            setTimeout(() => {
                statusSpan.innerHTML = '● Auto-guardado activo';
            }, 2000);
        }
    }

    saveToFile() {
        if (this.currentFile) {
            this.downloadFile(this.currentFile);
            this.showNotification(`Guardado: ${this.currentFile}`, 'success');
        } else {
            this.saveAsFile();
        }
    }

    saveAsFile() {
        let fileName = prompt('Nombre del archivo:', this.currentFile || 'mi_historia.json');
        if (fileName) {
            if (!fileName.endsWith('.json')) {
                fileName = fileName + '.json';
            }
            this.currentFile = fileName;
            this.downloadFile(fileName);
            this.updateFileInfo();
            this.showNotification(`Guardado como: ${fileName}`, 'success');
        }
    }

    downloadFile(fileName) {
        this.state.metadata.lastModified = new Date().toISOString();
        const dataStr = JSON.stringify(this.state, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    openFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const loadedState = JSON.parse(e.target.result);
                this.state = loadedState;
                this.currentFile = file.name;
                
                if (!this.state.settings) {
                    this.state.settings = {
                        theme: 'light',
                        accentColor: '#d4a373',
                        font: "'Inter', sans-serif",
                        compactMode: false,
                        cellWidth: 220,
                        cellHeight: 350,
                        colorIntensity: 60,
                        groupByType: false,
                        zoom: 1
                    };
                }
                if (!this.state.plotGroups) this.initPlotGroups();
                if (!this.state.characters) this.initCharacters();
                
                this.loadActsCollapsedState();
                this.applySettings();
                this.render();
                this.saveToLocalStorage();
                this.updateFileInfo();
                this.showNotification(`Abierto: ${file.name}`, 'success');
            } catch(err) {
                this.showNotification('Error al abrir el archivo', 'error');
                console.error(err);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    updateFileInfo() {
        const fileNameSpan = document.getElementById('current-file-name');
        if (fileNameSpan) {
            fileNameSpan.textContent = this.currentFile ? `📄 ${this.currentFile}` : '📄 Sin archivo abierto';
        }
    }

    showNotification(message, type = 'info') {
        const toast = document.getElementById('notification-toast');
        if (toast) {
            toast.textContent = message;
            toast.className = `notification-toast ${type} show`;
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
    }

    autoSave() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            this.saveToLocalStorage();
        }, 1000);
    }

    loadInitialData() {
        this.state.acts = [
            { id: 'a1', name: 'Acto 1: Planteamiento' },
            { id: 'a2', name: 'Acto 2: Confrontación' },
            { id: 'a3', name: 'Acto 3: Resolución' }
        ];
        
        // Inicializar estado de colapso
        this.state.acts.forEach(act => {
            if (!(act.id in this.actsCollapsed)) {
                this.actsCollapsed[act.id] = false;
            }
        });
        
        this.state.plots = [
            { id: 'p1', name: 'Conflicto Principal', type: 'story', color: '#e06c75', def: 'La lucha central de la historia.' },
            { id: 'p2', name: 'Misterio', type: 'story', color: '#61afef', def: 'El secreto oculto que se revela.' },
            { id: 'p3', name: 'Arco de Redención', type: 'character', characterIds: ['char1'], color: '#98c379', def: 'El viaje de transformación.' },
            { id: 'p4', name: 'Relación Alan-Elena', type: 'character', characterIds: ['char1', 'char2'], color: '#e5c07b', def: 'Trama romántica entre Alan y Elena.' }
        ];
        
        this.state.hitos = [
            { id: 'h1', name: 'Incidente incitante', actId: 'a1', plotId: 'p1', color: '#e06c75', def: 'El evento que rompe la rutina.' },
        ];
        
        this.state.chapters = [
            { id: 'c1', name: 'Capítulo 1', actId: 'a1' },
            { id: 'c2', name: 'Capítulo 2', actId: 'a1' },
            { id: 'c3', name: 'Capítulo 3', actId: 'a2' },
            { id: 'c4', name: 'Capítulo 4', actId: 'a3' },
        ];
        
        this.state.scenes = [
            { id: 's1', text: 'Introducción del entorno', chapterId: 'c1', plotId: 'p1' },
            { id: 's2', text: 'El protagonista conoce al antagonista', chapterId: 'c2', plotId: 'p1' },
            { id: 's3', text: 'Momento de duda', chapterId: 'c2', plotId: 'p3' },
        ];
        
        this.state.assignments = {
            'c1-p1': ['h1'],
            'c2-p1': ['h1']
        };
        this.saveActsCollapsedState();
        this.autoSave();
    }

    getGroupedPlotStructure() {
        const storyPlots = [];
        const characterPlots = [];
        
        this.state.plots.forEach(plot => {
            if (plot.type === 'story') {
                storyPlots.push(plot);
            } else if (plot.type === 'character') {
                characterPlots.push(plot);
            }
        });
        
        storyPlots.forEach(plot => {
            if (!plot.characterIds) plot.characterIds = [];
        });
        
        characterPlots.forEach(plot => {
            if (!plot.characterIds) plot.characterIds = [];
        });
        
        const characterGroups = [];
        this.state.characters.forEach(char => {
            const charPlots = characterPlots.filter(p => p.characterIds && p.characterIds.includes(char.id));
            if (charPlots.length > 0) {
                characterGroups.push({
                    type: 'character',
                    characterId: char.id,
                    characterName: char.name,
                    characterColor: char.color,
                    plots: charPlots,
                    span: charPlots.length
                });
            }
        });
        
        const assignedPlotIds = new Set();
        characterGroups.forEach(g => g.plots.forEach(p => assignedPlotIds.add(p.id)));
        
        const orphanPlots = characterPlots.filter(p => !assignedPlotIds.has(p.id));
        if (orphanPlots.length > 0) {
            characterGroups.push({
                type: 'orphan',
                characterName: '👤 Arcos sin personaje',
                characterColor: '#888',
                plots: orphanPlots,
                span: orphanPlots.length
            });
        }
        
        return {
            story: { type: 'story', name: '📖 TRAMAS DE HISTORIA', plots: storyPlots, span: storyPlots.length },
            characterGroups: characterGroups
        };
    }

    render() {
        this.renderActs();
        this.renderGrid();
        this.autoSave();
    }

    renderActs() {
        const container = document.getElementById('acts-container');
        if (!container) return;
        container.innerHTML = '';
        
        this.state.acts.forEach((act, index) => {
            const isCollapsed = this.actsCollapsed[act.id] || false;
            const actHitos = this.state.hitos.filter(h => h.actId === act.id);
            const card = document.createElement('div');
            card.className = 'acto-card draggable-act';
            if (isCollapsed) {
                card.classList.add('collapsed-card');
            }
            card.draggable = true;
            card.dataset.actId = act.id;
            card.dataset.actIndex = index;
            
            card.innerHTML = `
                <div class="acto-header">
                    <strong contenteditable="true" data-act-id="${act.id}">${this.escapeHtml(act.name)}</strong>
                    <div class="hito-actions">
                        <button class="btn-small collapse-act-btn" data-act-id="${act.id}" title="${isCollapsed ? 'Expandir' : 'Comprimir'}">
                            <i class="fas fa-${isCollapsed ? 'expand' : 'compress'}-alt"></i>
                        </button>
                        <button class="btn-small add-hito-act-btn" data-act-id="${act.id}"><i class="fas fa-plus"></i> Hito</button>
                        <button class="btn-small delete-act-btn" data-act-id="${act.id}" style="color:#e07a5f;"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="hitos-list" data-act-id="${act.id}">
                    ${actHitos.map(h => `
                        <div class="hito-item" draggable="true" data-hito-id="${h.id}" data-act-id="${act.id}" style="border-left-color: ${h.color}">
                            <div style="display:flex; justify-content:space-between; align-items:center">
                                <span>${this.escapeHtml(h.name)}</span>
                                <div class="hito-actions">
                                    <button class="btn-small show-hito-btn" data-hito-id="${h.id}"><i class="fas fa-book-open"></i></button>
                                    <button class="btn-small edit-hito-btn" data-hito-id="${h.id}"><i class="fas fa-edit"></i></button>
                                    <button class="btn-small delete-hito-btn" data-hito-id="${h.id}"><i class="fas fa-trash"></i></button>
                                </div>
                            </div>
                            <small style="opacity:0.7">${this.escapeHtml(this.state.plots.find(p => p.id === h.plotId)?.name || 'Sin trama')}</small>
                        </div>
                    `).join('')}
                    ${actHitos.length === 0 ? '<div class="empty-hitos"><small>No hay hitos aún. Haz clic en + para añadir.</small></div>' : ''}
                </div>
            `;
            
            container.appendChild(card);
        });
        
        this.attachActsEventListeners();
    }

    attachActsEventListeners() {
        const self = this;
        
        // Botones de colapsar acto individual
        document.querySelectorAll('.collapse-act-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const actId = btn.dataset.actId;
                if (actId) self.toggleActCollapsePanel(actId);
            });
        });
        
        // Configurar arrastre de ACTOS
        document.querySelectorAll('.acto-card').forEach(card => {
            card.addEventListener('dragstart', (e) => {
                const hitoElement = e.target.closest('.hito-item');
                if (hitoElement) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                
                if (e.target.closest('button') || 
                    e.target.closest('[contenteditable="true"]') || 
                    e.target.closest('input') || 
                    e.target.closest('textarea')) {
                    e.preventDefault();
                    return;
                }
                
                const actId = card.dataset.actId;
                const actIndex = card.dataset.actIndex;
                
                e.dataTransfer.setData('type', 'act-reorder');
                e.dataTransfer.setData('actId', actId);
                e.dataTransfer.setData('actIndex', actIndex);
                e.dataTransfer.effectAllowed = 'move';
                card.classList.add('dragging');
            });
            
            card.addEventListener('dragend', (e) => {
                card.classList.remove('dragging');
                document.querySelectorAll('.acto-card').forEach(c => c.classList.remove('drag-over'));
            });
            
            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const types = e.dataTransfer.types;
                let type = '';
                if (types.includes('type') || types.includes('text/plain')) {
                    type = e.dataTransfer.getData('type');
                }
                
                if (type === 'act-reorder') {
                    const draggedActId = e.dataTransfer.getData('actId');
                    if (draggedActId && draggedActId !== card.dataset.actId) {
                        e.dataTransfer.dropEffect = 'move';
                        card.classList.add('drag-over');
                    }
                } else if (type === 'hito') {
                    e.dataTransfer.dropEffect = 'move';
                }
            });
            
            card.addEventListener('dragleave', (e) => {
                card.classList.remove('drag-over');
            });
            
            card.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                card.classList.remove('drag-over');
                
                const type = e.dataTransfer.getData('type');
                
                if (type === 'act-reorder') {
                    const draggedActId = e.dataTransfer.getData('actId');
                    const draggedActIndex = parseInt(e.dataTransfer.getData('actIndex'));
                    
                    if (draggedActId && draggedActId !== card.dataset.actId && !isNaN(draggedActIndex)) {
                        const targetIndex = parseInt(card.dataset.actIndex);
                        self.reorderActs(draggedActIndex, targetIndex);
                    }
                } else if (type === 'hito') {
                    const hitoId = e.dataTransfer.getData('hitoId');
                    const targetActId = card.dataset.actId;
                    
                    if (hitoId && targetActId) {
                        const hito = self.state.hitos.find(h => h.id === hitoId);
                        if (hito && hito.actId !== targetActId) {
                            hito.actId = targetActId;
                            self.render();
                            self.showNotification('Hito movido a otro acto', 'success');
                        }
                    }
                }
            });
        });
        
        // Configurar arrastre de HITOS
        document.querySelectorAll('.hito-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                
                const hitoId = item.dataset.hitoId;
                e.dataTransfer.setData('type', 'hito');
                e.dataTransfer.setData('hitoId', hitoId);
                e.dataTransfer.effectAllowed = 'move';
                item.classList.add('dragging');
                
                const parentCard = item.closest('.acto-card');
                if (parentCard) {
                    parentCard.draggable = false;
                }
            });
            
            item.addEventListener('dragend', (e) => {
                item.classList.remove('dragging');
                
                const parentCard = item.closest('.acto-card');
                if (parentCard) {
                    parentCard.draggable = true;
                }
            });
        });
        
        // Botones de añadir hito
        document.querySelectorAll('.add-hito-act-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const actId = btn.dataset.actId;
                if (actId) self.openHitoModal(actId);
            });
        });
        
        // Botones de eliminar acto
        document.querySelectorAll('.delete-act-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const actId = btn.dataset.actId;
                if (actId) self.deleteAct(actId);
            });
        });
        
        // Nombres de acto editables
        document.querySelectorAll('[contenteditable="true"][data-act-id]').forEach(el => {
            el.addEventListener('blur', function() {
                const actId = this.dataset.actId;
                if (actId && this.innerText.trim()) {
                    app.updateActName(actId, this.innerText);
                }
            });
        });
        
        // Botones de mostrar definición de hito
        document.querySelectorAll('.show-hito-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const hitoId = btn.dataset.hitoId;
                if (hitoId) self.showHitoDef(hitoId);
            });
        });
        
        // Botones de editar hito
        document.querySelectorAll('.edit-hito-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const hitoId = btn.dataset.hitoId;
                if (hitoId) self.editHito(hitoId);
            });
        });
        
        // Botones de eliminar hito
        document.querySelectorAll('.delete-hito-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const hitoId = btn.dataset.hitoId;
                if (hitoId) self.deleteHito(hitoId);
            });
        });
    }

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ... (todos los demás métodos de modales, grid, etc. se mantienen igual)

    openPlotModal() {
        const modal = document.getElementById('modal-overlay');
        const body = document.getElementById('modal-body');
        
        body.innerHTML = `
            <h3 style="margin-bottom:15px">Nueva Trama / Arco</h3>
            
            <label>Tipo</label>
            <select id="plot-type">
                <option value="story">📖 Trama de Historia</option>
                <option value="character">👤 Arco de Personaje</option>
            </select>
            
            <div id="character-selector" style="display:none;">
                <label>Personajes involucrados (puede seleccionar varios)</label>
                <div id="character-checkboxes">
                    ${this.state.characters.map(c => `
                        <label style="display:flex; align-items:center; gap:8px; margin:5px 0;">
                            <input type="checkbox" value="${c.id}" style="width:auto; margin:0;">
                            <span style="display:inline-block; width:16px; height:16px; background:${c.color}; border-radius:4px;"></span>
                            ${this.escapeHtml(c.name)}
                        </label>
                    `).join('')}
                </div>
                <button type="button" class="btn-small" id="manage-chars-btn" style="margin-top:10px;">
                    <i class="fas fa-users"></i> Gestionar personajes
                </button>
            </div>
            
            <label>Nombre</label>
            <input type="text" id="p-name" placeholder="Ej: El viaje del héroe">
            
            <label>Color</label>
            <input type="color" id="p-color" value="#d4a373">
            
            <label>Definición</label>
            <textarea id="p-def" rows="3" placeholder="Describe esta trama o arco..."></textarea>
        `;
        
        const typeSelect = body.querySelector('#plot-type');
        const characterSelector = body.querySelector('#character-selector');
        
        typeSelect.onchange = () => {
            characterSelector.style.display = typeSelect.value === 'character' ? 'block' : 'none';
        };
        
        const manageCharsBtn = body.querySelector('#manage-chars-btn');
        if (manageCharsBtn) {
            manageCharsBtn.addEventListener('click', () => {
                this.closeModalQuiet();
                this.openCharacterManager();
            });
        }
        
        modal.style.display = 'flex';
        
        document.getElementById('modal-confirm').onclick = () => {
            const name = document.getElementById('p-name').value.trim();
            if (!name) return alert("El nombre es obligatorio.");
            
            const type = document.getElementById('plot-type').value;
            const plotData = {
                id: 'p' + Date.now(),
                name: name,
                type: type,
                color: document.getElementById('p-color').value,
                def: document.getElementById('p-def').value
            };
            
            if (type === 'character') {
                const selectedChars = [];
                document.querySelectorAll('#character-checkboxes input:checked').forEach(cb => {
                    selectedChars.push(cb.value);
                });
                plotData.characterIds = selectedChars;
            }
            
            this.state.plots.push(plotData);
            this.closeModal();
            this.render();
        };
    }

    editPlot(id) {
        const plot = this.state.plots.find(p => p.id === id);
        if (!plot) return;
        
        const modal = document.getElementById('modal-overlay');
        const body = document.getElementById('modal-body');
        
        body.innerHTML = `
            <h3 style="margin-bottom:15px">Editar Trama / Arco</h3>
            
            <label>Tipo</label>
            <select id="plot-type">
                <option value="story" ${plot.type === 'story' ? 'selected' : ''}>📖 Trama de Historia</option>
                <option value="character" ${plot.type === 'character' ? 'selected' : ''}>👤 Arco de Personaje</option>
            </select>
            
            <div id="character-selector" style="display:${plot.type === 'character' ? 'block' : 'none'};">
                <label>Personajes involucrados</label>
                <div id="character-checkboxes">
                    ${this.state.characters.map(c => `
                        <label style="display:flex; align-items:center; gap:8px; margin:5px 0;">
                            <input type="checkbox" value="${c.id}" ${plot.characterIds && plot.characterIds.includes(c.id) ? 'checked' : ''} style="width:auto; margin:0;">
                            <span style="display:inline-block; width:16px; height:16px; background:${c.color}; border-radius:4px;"></span>
                            ${this.escapeHtml(c.name)}
                        </label>
                    `).join('')}
                </div>
                <button type="button" class="btn-small" id="manage-chars-btn-edit" style="margin-top:10px;">
                    <i class="fas fa-users"></i> Gestionar personajes
                </button>
            </div>
            
            <label>Nombre</label>
            <input type="text" id="p-name" value="${this.escapeHtml(plot.name)}">
            
            <label>Color</label>
            <input type="color" id="p-color" value="${plot.color}">
            
            <label>Definición</label>
            <textarea id="p-def" rows="4">${plot.def ? this.escapeHtml(plot.def) : ''}</textarea>
            
            <button id="delete-plot-btn" class="btn-small" style="background:#e07a5f; color:white; margin-top:15px; width:100%;">
                <i class="fas fa-trash"></i> Eliminar Trama
            </button>
        `;
        
        const typeSelect = body.querySelector('#plot-type');
        const characterSelector = body.querySelector('#character-selector');
        
        typeSelect.onchange = () => {
            characterSelector.style.display = typeSelect.value === 'character' ? 'block' : 'none';
        };
        
        const manageCharsBtn = body.querySelector('#manage-chars-btn-edit');
        if (manageCharsBtn) {
            manageCharsBtn.addEventListener('click', () => {
                this.closeModalQuiet();
                this.openCharacterManager();
            });
        }
        
        modal.style.display = 'flex';
        
        const deleteBtn = document.getElementById('delete-plot-btn');
        if (deleteBtn) {
            deleteBtn.onclick = () => {
                if (confirm(`¿Eliminar "${plot.name}"? Se eliminarán también sus hitos y escenas.`)) {
                    this.deletePlot(id);
                    this.closeModal();
                }
            };
        }
        
        document.getElementById('modal-confirm').onclick = () => {
            const name = document.getElementById('p-name').value.trim();
            if (!name) return alert("El nombre es obligatorio.");
            
            plot.name = name;
            plot.type = document.getElementById('plot-type').value;
            plot.color = document.getElementById('p-color').value;
            plot.def = document.getElementById('p-def').value;
            
            if (plot.type === 'character') {
                const selectedChars = [];
                document.querySelectorAll('#character-checkboxes input:checked').forEach(cb => {
                    selectedChars.push(cb.value);
                });
                plot.characterIds = selectedChars;
            } else {
                delete plot.characterIds;
            }
            
            this.state.hitos.forEach(h => { if (h.plotId === id) h.color = plot.color; });
            this.closeModal();
            this.render();
            this.autoSave();
        };
    }

    deletePlot(id) {
        this.state.plots = this.state.plots.filter(p => p.id !== id);
        this.state.hitos = this.state.hitos.filter(h => h.plotId !== id);
        this.state.scenes = this.state.scenes.filter(s => s.plotId !== id);
        Object.keys(this.state.assignments).forEach(key => {
            if (key.endsWith('-' + id)) {
                delete this.state.assignments[key];
            }
        });
        this.render();
        this.showNotification('Trama eliminada', 'success');
    }

    openPlotColorModal(plotId) {
        const plot = this.state.plots.find(p => p.id === plotId);
        if (!plot) return;
        
        const modal = document.getElementById('modal-overlay');
        const body = document.getElementById('modal-body');
        body.innerHTML = `
            <h3 style="margin-bottom:15px">Personalizar Color de Trama</h3>
            <label>Trama: <strong>${this.escapeHtml(plot.name)}</strong></label>
            <label style="margin-top:15px">Color</label>
            <input type="color" id="plot-color" value="${plot.color}">
            <div style="margin-top:15px; padding:10px; background:var(--bg-color); border-radius:8px;">
                <small><i class="fas fa-info-circle"></i> El color se aplicará a toda la columna.</small>
            </div>
        `;
        modal.style.display = 'flex';
        document.getElementById('modal-confirm').onclick = () => {
            const newColor = document.getElementById('plot-color').value;
            this.updatePlotColor(plotId, newColor);
            this.closeModal();
        };
    }

    openCharacterManager() {
        const modal = document.getElementById('modal-overlay');
        const body = document.getElementById('modal-body');
        const confirmBtn = document.getElementById('modal-confirm');
        
        const charactersList = this.state.characters.map(c => `
            <div class="character-item" style="display:flex; justify-content:space-between; align-items:center; padding:10px; margin:5px 0; background:var(--bg-color); border-radius:8px; border-left:4px solid ${c.color};">
                <div>
                    <strong>${this.escapeHtml(c.name)}</strong>
                    <span style="display:inline-block; width:20px; height:20px; background:${c.color}; border-radius:4px; margin-left:10px;"></span>
                </div>
                <div>
                    <button class="btn-small edit-char-btn" data-char-id="${c.id}"><i class="fas fa-edit"></i> Editar</button>
                    <button class="btn-small delete-char-btn" data-char-id="${c.id}" style="color:#e07a5f;"><i class="fas fa-trash"></i> Eliminar</button>
                </div>
            </div>
        `).join('');
        
        body.innerHTML = `
            <h3 style="margin-bottom:15px">Gestionar Personajes</h3>
            <div id="characters-list" style="max-height:300px; overflow-y:auto; margin:15px 0;">
                ${charactersList || '<p style="color:var(--text-muted); text-align:center;">No hay personajes</p>'}
            </div>
            <button class="btn-primary" style="width:100%;" id="add-char-from-manager">
                <i class="fas fa-plus"></i> Nuevo Personaje
            </button>
        `;
        
        modal.style.display = 'flex';
        confirmBtn.style.display = 'none';
        confirmBtn.onclick = null;
        
        document.querySelectorAll('.edit-char-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.openCharacterModal(btn.dataset.charId);
            });
        });
        
        document.querySelectorAll('.delete-char-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.deleteCharacter(btn.dataset.charId);
            });
        });
        
        const addBtn = document.getElementById('add-char-from-manager');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.openCharacterModal(null);
            });
        }
    }

    openCharacterModal(characterId = null) {
        const isEditing = characterId !== null;
        const character = isEditing ? this.state.characters.find(c => c.id === characterId) : null;
        
        const modal = document.getElementById('modal-overlay');
        const body = document.getElementById('modal-body');
        const confirmBtn = document.getElementById('modal-confirm');
        
        body.innerHTML = `
            <h3 style="margin-bottom:15px">${isEditing ? 'Editar' : 'Nuevo'} Personaje</h3>
            <label>Nombre</label>
            <input type="text" id="char-name" value="${character ? this.escapeHtml(character.name) : ''}" placeholder="Ej: Alan">
            <label>Color</label>
            <input type="color" id="char-color" value="${character ? character.color : '#98c379'}">
        `;
        
        modal.style.display = 'flex';
        confirmBtn.style.display = 'block';
        
        confirmBtn.onclick = () => {
            const name = document.getElementById('char-name')?.value.trim();
            if (!name) return alert("El nombre es obligatorio.");
            
            if (isEditing && character) {
                character.name = name;
                character.color = document.getElementById('char-color')?.value || '#98c379';
            } else {
                this.state.characters.push({
                    id: 'char' + Date.now(),
                    name: name,
                    color: document.getElementById('char-color')?.value || '#98c379'
                });
            }
            
            this.closeModal();
            this.openCharacterManager();
            this.render();
        };
    }

    editCharacter(id) {
        this.openCharacterModal(id);
    }

    deleteCharacter(id) {
        if (confirm('¿Eliminar este personaje? Los arcos asociados perderán la referencia.')) {
            this.state.characters = this.state.characters.filter(c => c.id !== id);
            this.state.plots.forEach(plot => {
                if (plot.characterIds) {
                    plot.characterIds = plot.characterIds.filter(cid => cid !== id);
                }
            });
            this.render();
            this.showNotification('Personaje eliminado', 'success');
        }
    }

    renderGrid() {
        const grid = document.getElementById('plot-grid');
        if (!grid) return;
        grid.innerHTML = '';
        
        const isCompact = this.state.settings.compactMode;
        const structure = this.getGroupedPlotStructure();
        
        let totalPlots = structure.story.span;
        structure.characterGroups.forEach(g => totalPlots += g.span);
        
        if (totalPlots === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'empty-grid-message';
            emptyMsg.style.gridColumn = '1';
            emptyMsg.innerHTML = '<i class="fas fa-info-circle"></i> No hay tramas. Haz clic en "Añadir Trama" para comenzar.';
            grid.appendChild(emptyMsg);
            return;
        }
        
        const cellWidth = isCompact ? Math.max(this.state.settings.cellWidth * 0.7, 140) : this.state.settings.cellWidth;
        grid.style.display = 'grid';
        grid.style.gap = '1px';
        grid.style.backgroundColor = 'var(--border-color)';
        grid.style.border = '1px solid var(--border-color)';
        grid.style.gridTemplateColumns = `repeat(${totalPlots}, ${cellWidth}px)`;
        
        // FILA DE CABECERAS DE GRUPO
        if (structure.story.span > 0) {
            const storyHeader = document.createElement('div');
            storyHeader.className = 'group-header';
            storyHeader.style.gridColumn = `span ${structure.story.span}`;
            storyHeader.style.background = 'linear-gradient(135deg, var(--accent-color) 0%, var(--accent-hover) 100%)';
            storyHeader.innerHTML = `<div class="group-header-content"><span><i class="fas fa-book"></i> ${structure.story.name}</span><span class="group-count">${structure.story.span} tramas</span></div>`;
            grid.appendChild(storyHeader);
        }
        
        structure.characterGroups.forEach(group => {
            if (group.span > 0) {
                const charHeader = document.createElement('div');
                charHeader.className = 'group-header character-group';
                charHeader.style.gridColumn = `span ${group.span}`;
                charHeader.style.background = `linear-gradient(135deg, ${group.characterColor} 0%, ${group.characterColor}cc 100%)`;
                charHeader.innerHTML = `<div class="group-header-content"><span><i class="fas fa-user"></i> ${group.characterName}</span><span class="group-count">${group.span} arcos</span></div>`;
                grid.appendChild(charHeader);
            }
        });
        
        // FILA DE TÍTULOS DE TRAMAS
        let currentCol = 0;
        
        structure.story.plots.forEach(plot => {
            const header = this.createPlotHeader(plot, currentCol, totalPlots);
            grid.appendChild(header);
            currentCol++;
        });
        
        structure.characterGroups.forEach(group => {
            group.plots.forEach(plot => {
                const header = this.createPlotHeader(plot, currentCol, totalPlots);
                grid.appendChild(header);
                currentCol++;
            });
        });
        
        // CAPÍTULOS Y CELDAS
        this.state.chapters.forEach((chap, chapIndex) => {
            const act = this.state.acts.find(a => a.id === chap.actId);
            const isFirstInAct = !this.state.chapters.some((c, idx) => idx < chapIndex && c.actId === chap.actId);
            
            if (isFirstInAct && act) {
                const isActCollapsed = this.actsCollapsed[act.id] || false;
                
                const actDiv = document.createElement('div');
                actDiv.className = 'act-divider';
                actDiv.style.gridColumn = `span ${totalPlots}`;
                actDiv.draggable = true;
                actDiv.dataset.actId = act.id;
                actDiv.dataset.chapIndex = chapIndex;
                
                if (isActCollapsed) {
                    actDiv.classList.add('collapsed-act');
                }
                
                actDiv.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <span>📖 ${this.escapeHtml(act.name)}</span>
                        <span class="collapse-indicator" data-act-id="${act.id}" style="cursor: pointer; padding: 0 10px;">
                            ${isActCollapsed ? '▶' : '▼'}
                        </span>
                    </div>
                `;
                
                const collapseIndicator = actDiv.querySelector('.collapse-indicator');
                if (collapseIndicator) {
                    collapseIndicator.addEventListener('click', (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        this.toggleActCollapseGrid(act.id);
                    });
                }
                
                // Eventos de arrastre
                actDiv.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('type', 'act-grid-reorder');
                    e.dataTransfer.setData('actId', act.id);
                    e.dataTransfer.setData('chapIndex', chapIndex);
                    e.dataTransfer.effectAllowed = 'move';
                    actDiv.classList.add('dragging');
                });
                
                actDiv.addEventListener('dragend', () => {
                    actDiv.classList.remove('dragging');
                    document.querySelectorAll('.act-divider').forEach(d => d.classList.remove('drag-over-act'));
                });
                
                actDiv.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const draggedType = e.dataTransfer.getData('type');
                    if (draggedType === 'hito' || draggedType === 'scene') return;
                    
                    const draggedActId = e.dataTransfer.getData('actId');
                    if ((draggedType === 'act-grid-reorder' || draggedType === 'act-reorder') &&
                        draggedActId && draggedActId !== act.id) {
                        e.dataTransfer.dropEffect = 'move';
                        actDiv.classList.add('drag-over-act');
                    }
                });
                
                actDiv.addEventListener('dragleave', () => {
                    actDiv.classList.remove('drag-over-act');
                });
                
                actDiv.addEventListener('drop', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    actDiv.classList.remove('drag-over-act');
                    
                    const draggedType = e.dataTransfer.getData('type');
                    if (draggedType === 'hito' || draggedType === 'scene') return;
                    
                    const draggedActId = e.dataTransfer.getData('actId');
                    if ((draggedType === 'act-grid-reorder' || draggedType === 'act-reorder') &&
                        draggedActId && draggedActId !== act.id) {
                        
                        const fromAct = this.state.acts.find(a => a.id === draggedActId);
                        const toAct = act;
                        
                        if (fromAct && toAct) {
                            const fromIndex = this.state.acts.indexOf(fromAct);
                            const toIndex = this.state.acts.indexOf(toAct);
                            
                            if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
                                this.reorderActs(fromIndex, toIndex);
                            }
                        }
                    }
                });
                
                grid.appendChild(actDiv);
            }
            
            // SOLO RENDERIZAR CELDAS SI EL ACTO NO ESTÁ COLAPSADO
            const actForChapter = this.state.acts.find(a => a.id === chap.actId);
            const isActCollapsed = actForChapter ? (this.actsCollapsed[actForChapter.id] || false) : false;
            
            if (!isActCollapsed) {
                let plotIndex = 0;
                
                structure.story.plots.forEach(plot => {
                    const cell = this.createGridCell(chap, plot, plotIndex, totalPlots, isCompact);
                    grid.appendChild(cell);
                    plotIndex++;
                });
                
                structure.characterGroups.forEach(group => {
                    group.plots.forEach(plot => {
                        const cell = this.createGridCell(chap, plot, plotIndex, totalPlots, isCompact);
                        grid.appendChild(cell);
                        plotIndex++;
                    });
                });
            }
        });
        
        setTimeout(() => {
            this.applyCellSizes();
            this.applyColumnColors();
            this.setupGroupDragAndDrop();
            this.attachGridEventListeners();
        }, 10);
    }

    createPlotHeader(plot, currentCol, totalPlots) {
        const header = document.createElement('div');
        header.className = 'grid-cell plot-header';
        header.draggable = true;
        header.dataset.plotIndex = currentCol;
        header.dataset.plotId = plot.id;
        header.dataset.plotType = plot.type;
        header.dataset.characterId = plot.characterIds ? plot.characterIds[0] : '';
        header.style.borderRight = (currentCol < totalPlots - 1) ? '1px solid var(--border-color)' : 'none';
        
        let typeIcon = plot.type === 'story' ? '📖' : '👤';
        let characterNames = '';
        if (plot.type === 'character' && plot.characterIds && plot.characterIds.length > 0) {
            const names = plot.characterIds.map(cid => {
                const char = this.state.characters.find(c => c.id === cid);
                return char ? char.name : '';
            }).filter(n => n);
            characterNames = `<small style="font-size:0.55rem; opacity:0.7;">${names.join(', ')}</small>`;
        }
        
        header.innerHTML = `
            <div class="plot-header-content">
                <span>${typeIcon} ${this.escapeHtml(plot.name)}</span>
                ${characterNames}
                <div class="plot-header-buttons">
                    <button class="btn-small btn-icon plot-color-btn" data-plot-id="${plot.id}" title="Editar color"><i class="fas fa-palette"></i></button>
                    <button class="btn-small btn-icon plot-edit-btn" data-plot-id="${plot.id}" title="Editar trama"><i class="fas fa-edit"></i></button>
                </div>
            </div>
        `;
        
        return header;
    }

    createGridCell(chap, plot, plotIndex, totalPlots, isCompact) {
        const cellId = `${chap.id}-${plot.id}`;
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.draggable = true;
        cell.dataset.chapIndex = null;
        cell.dataset.cellId = cellId;
        cell.dataset.plotColumn = plotIndex;
        cell.dataset.plotId = plot.id;
        cell.style.borderRight = (plotIndex < totalPlots - 1) ? '1px solid var(--border-color)' : 'none';
        cell.style.borderBottom = '1px solid var(--border-color)';
        
        const assignedHitos = (this.state.assignments[cellId] || [])
            .map(hid => this.state.hitos.find(h => h.id === hid)).filter(Boolean);
        
        const scenes = this.state.scenes.filter(s => s.chapterId === chap.id && s.plotId === plot.id);
        
        let typeBadge = plot.type === 'story' ?
            '<span class="plot-type-badge story">📖 Historia</span>' :
            `<span class="plot-type-badge character">👤 ${plot.characterIds && plot.characterIds.length > 0 ? plot.characterIds.map(cid => {
                const char = this.state.characters.find(c => c.id === cid);
                return char ? char.name : '';
            }).filter(n => n).join(', ') : 'Sin personaje'}</span>`;
        
        if (isCompact) {
            cell.innerHTML = `
                <div class="chapter-header">
                    <span class="chapter-name" contenteditable="true" data-chapter-id="${chap.id}">${this.escapeHtml(chap.name)}</span>
                    <button class="btn-icon-mini delete-chapter-btn" data-chapter-id="${chap.id}"><i class="fas fa-trash"></i></button>
                </div>
                <div class="hito-badges">
                    ${assignedHitos.slice(0, 2).map(h => `<span class="badge-hito" style="background:${h.color}" data-hito-id="${h.id}" data-cell-id="${cellId}">${this.escapeHtml(h.name.substring(0, 12))}${h.name.length > 12 ? '&hellip;' : ''}</span>`).join('')}
                    ${assignedHitos.length > 2 ? `<span class="badge-hito-more">+${assignedHitos.length - 2}</span>` : ''}
                    <button class="btn-add-hito-mini assign-hito-btn" data-cell-id="${cellId}" data-plot-id="${plot.id}">+</button>
                </div>
                <div class="scenes-container" data-cell-id="${cellId}">
                    ${scenes.slice(0, 2).map(s => `
                        <div class="escena-card" draggable="true" data-scene-id="${s.id}" style="border-left-color:${plot.color}">
                            <div class="escena-text" data-scene-id="${s.id}">${this.escapeHtml(s.text.length > 40 ? s.text.substring(0, 40) + '…' : s.text)}</div>
                            <div class="escena-buttons">
                                <button class="btn-del-scene edit-scene-btn" data-scene-id="${s.id}"><i class="fas fa-edit"></i></button>
                                <button class="btn-del-scene delete-scene-btn" data-scene-id="${s.id}"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    `).join('')}
                    ${scenes.length > 2 ? `<div class="more-scenes">+${scenes.length - 2} más</div>` : ''}
                </div>
                ${scenes.length === 0 ? `<button class="btn-add-scene-mini add-scene-btn" data-chapter-id="${chap.id}" data-plot-id="${plot.id}">+ Escena</button>` : ''}
            `;
        } else {
            cell.innerHTML = `
                <div class="chapter-header">
                    <span class="chapter-name" contenteditable="true" data-chapter-id="${chap.id}">${this.escapeHtml(chap.name)}</span>
                    <div class="chapter-actions">
                        <button class="btn-small btn-icon delete-chapter-btn" data-chapter-id="${chap.id}"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="plot-meta">${typeBadge}</div>
                <div class="hito-badges">
                    ${assignedHitos.map(h => `<span class="badge-hito" style="background:${h.color}" data-hito-id="${h.id}" data-cell-id="${cellId}">${this.escapeHtml(h.name)} ✕</span>`).join('')}
                    <button class="btn-small btn-add-hito assign-hito-btn" data-cell-id="${cellId}" data-plot-id="${plot.id}">+ Hito</button>
                </div>
                <div class="scenes-container" data-cell-id="${cellId}">
                    ${scenes.map(s => `
                        <div class="escena-card" draggable="true" data-scene-id="${s.id}" style="border-left-color:${plot.color}">
                            <div class="escena-text" data-scene-id="${s.id}">${this.escapeHtml(s.text)}</div>
                            <div class="escena-buttons">
                                <button class="btn-del-scene edit-scene-btn" data-scene-id="${s.id}"><i class="fas fa-edit"></i></button>
                                <button class="btn-del-scene delete-scene-btn" data-scene-id="${s.id}"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <button class="btn-small btn-add-scene add-scene-btn" data-chapter-id="${chap.id}" data-plot-id="${plot.id}"><i class="fas fa-plus"></i> Escena</button>
            `;
        }
        
        return cell;
    }

    attachGridEventListeners() {
        document.querySelectorAll('.plot-color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const plotId = btn.dataset.plotId;
                if (plotId) this.openPlotColorModal(plotId);
            });
        });
        
        document.querySelectorAll('.plot-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const plotId = btn.dataset.plotId;
                if (plotId) this.editPlot(plotId);
            });
        });
        
        document.querySelectorAll('.chapter-name[contenteditable="true"]').forEach(el => {
            el.addEventListener('blur', function() {
                const chapterId = this.dataset.chapterId;
                if (chapterId && this.innerText.trim()) {
                    app.updateChapterName(chapterId, this.innerText);
                }
            });
        });
        
        document.querySelectorAll('.delete-chapter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const chapterId = btn.dataset.chapterId;
                if (chapterId) app.deleteChapter(chapterId);
            });
        });
        
        document.querySelectorAll('.badge-hito').forEach(badge => {
            badge.addEventListener('click', (e) => {
                e.stopPropagation();
                const hitoId = badge.dataset.hitoId;
                const cellId = badge.dataset.cellId;
                if (hitoId && cellId) app.removeHitoFromCell(cellId, hitoId);
            });
        });
        
        document.querySelectorAll('.assign-hito-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const cellId = btn.dataset.cellId;
                const plotId = btn.dataset.plotId;
                if (cellId && plotId) app.openAssignHitoModal(cellId, plotId);
            });
        });
        
        document.querySelectorAll('.edit-scene-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const sceneId = btn.dataset.sceneId;
                if (sceneId) app.editScene(sceneId);
            });
        });
        
        document.querySelectorAll('.delete-scene-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const sceneId = btn.dataset.sceneId;
                if (sceneId) app.deleteScene(sceneId);
            });
        });
        
        document.querySelectorAll('.escena-text').forEach(text => {
            text.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const sceneId = text.dataset.sceneId;
                if (sceneId) app.editScene(sceneId);
            });
        });
        
        document.querySelectorAll('.add-scene-btn, .btn-add-scene, .btn-add-scene-mini').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const chapterId = btn.dataset.chapterId;
                const plotId = btn.dataset.plotId;
                if (chapterId && plotId) app.openSceneModal(chapterId, plotId);
            });
        });
    }

    updateChapterName(id, name) {
        const chapter = this.state.chapters.find(c => c.id === id);
        if (chapter && name.trim()) {
            chapter.name = name.trim();
            this.render();
        }
    }

    deleteChapter(id) {
        if (confirm('¿Eliminar este capítulo y todas sus escenas?')) {
            this.state.chapters = this.state.chapters.filter(c => c.id !== id);
            this.state.scenes = this.state.scenes.filter(s => s.chapterId !== id);
            Object.keys(this.state.assignments).forEach(key => {
                if (key.startsWith(id + '-')) {
                    delete this.state.assignments[key];
                }
            });
            this.render();
        }
    }

    openChapterModal() {
        if (this.state.acts.length === 0) {
            alert("Primero crea al menos un acto.");
            return;
        }
        const modal = document.getElementById('modal-overlay');
        const body = document.getElementById('modal-body');
        body.innerHTML = `
            <h3 style="margin-bottom:15px">Nuevo Capítulo</h3>
            <label>Nombre</label>
            <input type="text" id="c-name" placeholder="Ej: Capítulo 1">
            <label>Acto</label>
            <select id="c-act">
                ${this.state.acts.map(a => `<option value="${a.id}">${this.escapeHtml(a.name)}</option>`).join('')}
            </select>
        `;
        modal.style.display = 'flex';
        document.getElementById('modal-confirm').onclick = () => {
            const name = document.getElementById('c-name').value.trim();
            if (!name) return alert("El nombre es obligatorio.");
            this.state.chapters.push({
                id: 'c' + Date.now(),
                name: name,
                actId: document.getElementById('c-act').value
            });
            this.closeModal();
            this.render();
        };
    }

    openSceneModal(chapId, plotId) {
        const modal = document.getElementById('modal-overlay');
        const body = document.getElementById('modal-body');
        body.innerHTML = `
            <h3 style="margin-bottom:15px">Nueva Escena</h3>
            <textarea id="s-text" rows="6" placeholder="Describe la acción de la escena..."></textarea>
            <small><i class="fas fa-info-circle"></i> Puedes hacer doble clic en una escena para editarla después.</small>
        `;
        modal.style.display = 'flex';
        document.getElementById('modal-confirm').onclick = () => {
            const text = document.getElementById('s-text').value.trim();
            if (!text) return alert("La escena no puede estar vacía.");
            this.state.scenes.push({
                id: 's' + Date.now(),
                text: text,
                chapterId: chapId,
                plotId: plotId
            });
            this.closeModal();
            this.render();
        };
    }

    editScene(id) {
        const scene = this.state.scenes.find(s => s.id === id);
        if (!scene) return;
        
        const modal = document.getElementById('modal-overlay');
        const body = document.getElementById('modal-body');
        body.innerHTML = `
            <h3 style="margin-bottom:15px">Editar Escena</h3>
            <textarea id="s-text" rows="8" placeholder="Describe la acción de la escena...">${this.escapeHtml(scene.text)}</textarea>
        `;
        modal.style.display = 'flex';
        document.getElementById('modal-confirm').onclick = () => {
            const text = document.getElementById('s-text').value.trim();
            if (!text) return alert("La escena no puede estar vacía.");
            scene.text = text;
            this.closeModal();
            this.render();
        };
    }

    deleteScene(id) {
        if (confirm('¿Eliminar esta escena?')) {
            this.state.scenes = this.state.scenes.filter(s => s.id !== id);
            this.render();
        }
    }

    openHitoModal(actId, editId = null) {
        const hito = editId ? this.state.hitos.find(h => h.id === editId) : null;
        const modal = document.getElementById('modal-overlay');
        const body = document.getElementById('modal-body');
        body.innerHTML = `
            <h3 style="margin-bottom:15px">${hito ? 'Editar Hito' : 'Nuevo Hito'}</h3>
            <label>Nombre</label>
            <input type="text" id="h-name" value="${hito ? this.escapeHtml(hito.name) : ''}">
            <label>Trama</label>
            <select id="h-plot">${this.state.plots.map(p => `<option value="${p.id}" ${hito?.plotId === p.id ? 'selected' : ''}>${this.escapeHtml(p.name)}</option>`).join('')}</select>
            <label>Color</label>
            <input type="color" id="h-color" value="${hito ? hito.color : '#d4a373'}">
            <label>Definición</label>
            <textarea id="h-def" rows="4">${hito ? this.escapeHtml(hito.def) : ''}</textarea>
        `;
        modal.style.display = 'flex';
        document.getElementById('modal-confirm').onclick = () => {
            const name = document.getElementById('h-name').value.trim();
            if (!name) return alert("El hito debe tener un nombre.");
            const data = {
                id: editId || 'h' + Date.now(),
                name: name,
                plotId: document.getElementById('h-plot').value,
                color: document.getElementById('h-color').value,
                def: document.getElementById('h-def').value,
                actId: actId
            };
            if (editId) {
                const idx = this.state.hitos.findIndex(h => h.id === editId);
                if (idx !== -1) this.state.hitos[idx] = data;
            } else {
                this.state.hitos.push(data);
            }
            this.closeModal();
            this.render();
        };
    }

    editHito(id) {
        const hito = this.state.hitos.find(h => h.id === id);
        if (hito) this.openHitoModal(hito.actId, id);
    }

    deleteHito(id) {
        if (confirm('¿Eliminar este hito?')) {
            this.state.hitos = this.state.hitos.filter(h => h.id !== id);
            Object.keys(this.state.assignments).forEach(k => {
                this.state.assignments[k] = this.state.assignments[k].filter(hid => hid !== id);
            });
            this.render();
        }
    }

    openAssignHitoModal(cellId, plotId) {
        const filtered = this.state.hitos.filter(h => h.plotId === plotId);
        if (filtered.length === 0) {
            alert("No hay hitos para esta trama. Crea hitos primero en el panel de Actos.");
            return;
        }
        const modal = document.getElementById('modal-overlay');
        const body = document.getElementById('modal-body');
        body.innerHTML = `
            <h3 style="margin-bottom:15px">Asignar Hito</h3>
            <div class="hito-list-modal">
                ${filtered.map(h => `
                    <div class="hito-item-modal" style="border-left:4px solid ${h.color}; cursor:pointer; padding:10px; margin:5px 0; background:var(--surface-color); border-radius:8px;" data-hito-id="${h.id}">
                        ${this.escapeHtml(h.name)}
                    </div>
                `).join('')}
            </div>
        `;
        modal.style.display = 'flex';
        const confirmBtn = document.getElementById('modal-confirm');
        confirmBtn.style.display = 'none';
        
        document.querySelectorAll('.hito-item-modal').forEach(item => {
            item.addEventListener('click', () => {
                app.assignHitoToCell(cellId, item.dataset.hitoId);
            });
        });
    }

    assignHitoToCell(cellId, hitoId) {
        if (!this.state.assignments[cellId]) this.state.assignments[cellId] = [];
        if (!this.state.assignments[cellId].includes(hitoId)) {
            this.state.assignments[cellId].push(hitoId);
        }
        this.closeModal();
        this.render();
    }

    removeHitoFromCell(cellId, hitoId) {
        if (this.state.assignments[cellId]) {
            this.state.assignments[cellId] = this.state.assignments[cellId].filter(id => id !== hitoId);
            this.render();
        }
    }

    showHitoDef(id) {
        const hito = this.state.hitos.find(h => h.id === id);
        if (!hito) return;
        const plot = this.state.plots.find(p => p.id === hito.plotId);
        document.getElementById('def-body').innerHTML = `
            <h2 style="color:${hito.color}">${this.escapeHtml(hito.name)}</h2>
            <p style="margin:15px 0"><strong>Trama:</strong> ${plot ? this.escapeHtml(plot.name) : 'Sin trama'}</p>
            <p style="margin:15px 0"><strong>Definición:</strong><br>${this.escapeHtml(hito.def) || 'Sin definición'}</p>
        `;
        document.getElementById('definition-modal').style.display = 'flex';
    }

    closeDefModal() {
        document.getElementById('definition-modal').style.display = 'none';
    }

    openActModal() {
        const modal = document.getElementById('modal-overlay');
        const body = document.getElementById('modal-body');
        body.innerHTML = `
            <h3 style="margin-bottom:15px">Nuevo Acto</h3>
            <label>Nombre del Acto</label>
            <input type="text" id="act-name" placeholder="Ej: Acto 4: Epílogo">
        `;
        modal.style.display = 'flex';
        document.getElementById('modal-confirm').onclick = () => {
            const name = document.getElementById('act-name').value.trim();
            if (!name) return alert("Por favor, escribe un nombre.");
            const newActId = 'a' + Date.now();
            this.state.acts.push({ id: newActId, name: name });
            this.actsCollapsed[newActId] = false;
            this.saveActsCollapsedState();
            this.closeModal();
            this.render();
        };
    }

    deleteAct(id) {
        if (confirm('¿Eliminar este acto y todos sus capítulos e hitos?')) {
            this.state.acts = this.state.acts.filter(a => a.id !== id);
            const chaptersToDelete = this.state.chapters.filter(c => c.actId === id).map(c => c.id);
            this.state.chapters = this.state.chapters.filter(c => c.actId !== id);
            this.state.hitos = this.state.hitos.filter(h => h.actId !== id);
            this.state.scenes = this.state.scenes.filter(s => !chaptersToDelete.includes(s.chapterId));
            chaptersToDelete.forEach(chapId => {
                Object.keys(this.state.assignments).forEach(key => {
                    if (key.startsWith(chapId + '-')) {
                        delete this.state.assignments[key];
                    }
                });
            });
            delete this.actsCollapsed[id];
            this.saveActsCollapsedState();
            this.render();
        }
    }

    reorderActs(fromIndex, toIndex) {
        if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 ||
            fromIndex >= this.state.acts.length || toIndex >= this.state.acts.length) {
            return;
        }
        
        const [movedAct] = this.state.acts.splice(fromIndex, 1);
        this.state.acts.splice(toIndex, 0, movedAct);
        
        this.render();
        this.showNotification(`Acto "${movedAct.name}" movido a la posición ${toIndex + 1}`, 'success');
        this.autoSave();
    }

    updateActName(id, name) {
        const act = this.state.acts.find(a => a.id === id);
        if (act && name.trim()) {
            act.name = name.trim();
            this.render();
        }
    }

    toggleCompactMode() {
        this.state.settings.compactMode = !this.state.settings.compactMode;
        localStorage.setItem('pg-compact', this.state.settings.compactMode);
        this.render();
        this.autoSave();
        const compactBtn = document.getElementById('compactToggle');
        if (compactBtn) {
            if (this.state.settings.compactMode) {
                compactBtn.innerHTML = '<i class="fas fa-expand-alt"></i> Normal';
            } else {
                compactBtn.innerHTML = '<i class="fas fa-compress-alt"></i> Compacto';
            }
        }
        this.showNotification(this.state.settings.compactMode ? 'Modo compacto activado' : 'Modo normal activado', 'info');
    }

    toggleActsPanel() {
        const panel = document.getElementById('acts-panel');
        if (panel) {
            panel.classList.toggle('collapsed');
            const toggleBtn = document.getElementById('togglePanelBtn');
            if (toggleBtn) {
                const chevronIcon = toggleBtn.querySelector('i');
                if (chevronIcon) {
                    if (panel.classList.contains('collapsed')) {
                        chevronIcon.classList.remove('fa-chevron-up');
                        chevronIcon.classList.add('fa-chevron-down');
                    } else {
                        chevronIcon.classList.remove('fa-chevron-down');
                        chevronIcon.classList.add('fa-chevron-up');
                    }
                }
            }
        }
    }

    applySettings() {
        document.documentElement.setAttribute('data-theme', this.state.settings.theme);
        document.documentElement.style.setProperty('--accent-color', this.state.settings.accentColor);
        document.body.style.fontFamily = this.state.settings.font;
        
        const savedZoom = localStorage.getItem('pg-zoom');
        if (savedZoom) {
            const zoom = parseFloat(savedZoom);
            this.state.settings.zoom = zoom;
            const grid = document.getElementById('plot-grid');
            if (grid) {
                grid.style.transform = `scale(${zoom})`;
                grid.style.transformOrigin = 'top left';
            }
            const zoomSlider = document.getElementById('zoomRange');
            if (zoomSlider) zoomSlider.value = zoom;
        }
        
        const compactBtn = document.getElementById('compactToggle');
        if (compactBtn) {
            if (this.state.settings.compactMode) {
                compactBtn.innerHTML = '<i class="fas fa-expand-alt"></i> Normal';
            } else {
                compactBtn.innerHTML = '<i class="fas fa-compress-alt"></i> Compacto';
            }
        }
        
        const groupBtn = document.getElementById('groupToggle');
        if (groupBtn) {
            if (this.state.settings.groupByType) {
                groupBtn.classList.add('active');
            } else {
                groupBtn.classList.remove('active');
            }
        }
        
        // Actualizar selector de fuente
        const fontSelector = document.getElementById('fontSelector');
        if (fontSelector) {
            fontSelector.value = this.state.settings.font;
        }
    }

    toggleTheme() {
        this.state.settings.theme = this.state.settings.theme === 'light' ? 'dark' : 'light';
        this.applySettings();
        localStorage.setItem('pg-theme', this.state.settings.theme);
        this.render();
        this.autoSave();
    }

    updateAccentColor(color) {
        this.state.settings.accentColor = color;
        this.applySettings();
        localStorage.setItem('pg-accent', color);
        this.autoSave();
    }

    updateFont(font) {
        this.state.settings.font = font;
        this.applySettings();
        localStorage.setItem('pg-font', font);
        this.autoSave();
    }

    exportMarkdown() {
        let md = `# STORY BIBLE

## TRAMAS
`;
        this.state.plots.forEach(p => {
            let plotType = p.type === 'story' ? 'Historia' : `Arco de ${p.characterIds ? p.characterIds.map(cid => {
                const char = this.state.characters.find(c => c.id === cid);
                return char ? char.name : '';
            }).filter(n => n).join(', ') : 'Sin personaje'}`;
            md += `### ${p.name} (${plotType})
${p.def || 'Sin definición'}

`;
        });
        md += `## HITOS POR ACTO
`;
        this.state.acts.forEach(a => {
            md += `### ${a.name}
`;
            const actHitos = this.state.hitos.filter(h => h.actId === a.id);
            if (actHitos.length === 0) md += `*Sin hitos*
`;
            actHitos.forEach(h => md += `- **${h.name}**: ${h.def || 'Sin definición'}
`);
            md += `
`;
        });
        md += `## CAPÍTULOS Y ESCENAS
`;
        this.state.chapters.forEach(c => {
            const act = this.state.acts.find(a => a.id === c.actId);
            md += `### ${c.name} (${act ? act.name : 'Sin acto'})
`;
            const scenesInChapter = this.state.scenes.filter(s => s.chapterId === c.id);
            if (scenesInChapter.length === 0) md += `*Sin escenas*
`;
            scenesInChapter.forEach(s => {
                const plot = this.state.plots.find(p => p.id === s.plotId);
                md += `- [${plot ? plot.name : 'Sin trama'}] ${s.text}
`;
            });
            md += `
`;
        });
        const blob = new Blob([md], { type: 'text/markdown' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = this.currentFile ? this.currentFile.replace('.json', '.md') : 'story.md';
        a.click();
        URL.revokeObjectURL(a.href);
        this.showNotification('Exportado a Markdown', 'success');
    }

    newStory() {
        if (confirm('¿Empezar una nueva historia? Se perderán los cambios no guardados en archivo.')) {
            this.state = {
                acts: [],
                plots: [],
                plotGroups: [],
                characters: [],
                chapters: [],
                hitos: [],
                scenes: [],
                assignments: {},
                settings: this.state.settings,
                metadata: { lastModified: new Date().toISOString(), version: '1.0' }
            };
            this.currentFile = null;
            this.actsCollapsed = {};
            this.initPlotGroups();
            this.initCharacters();
            this.loadInitialData();
            this.render();
            this.saveToLocalStorage();
            this.saveActsCollapsedState();
            this.updateFileInfo();
            this.showNotification('Nueva historia creada', 'info');
        }
    }

    setupGlobalDragAndDrop() {
        const self = this;
        
        document.body.addEventListener('dragstart', (e) => {
            const target = e.target.closest('[draggable="true"]');
            if (!target) return;
            
            if (target.classList.contains('escena-card')) {
                e.dataTransfer.setData('type', 'scene');
                e.dataTransfer.setData('sceneId', target.dataset.sceneId);
                e.dataTransfer.effectAllowed = 'move';
                target.classList.add('dragging');
            }
        });

        document.body.addEventListener('dragend', (e) => {
            const target = e.target.closest('[draggable="true"]');
            if (target) target.classList.remove('dragging');
        });

        document.body.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        document.body.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const type = e.dataTransfer.getData('type');
            
            if (type === 'scene') {
                let targetContainer = e.target.closest('.scenes-container');
                if (!targetContainer) {
                    const targetCell = e.target.closest('.grid-cell');
                    if (targetCell) {
                        targetContainer = targetCell.querySelector('.scenes-container');
                    }
                }
                if (targetContainer) {
                    const sceneId = e.dataTransfer.getData('sceneId');
                    const targetCellId = targetContainer.dataset.cellId;
                    
                    if (targetCellId && sceneId) {
                        const [targetChapId, targetPlotId] = targetCellId.split('-');
                        const scene = self.state.scenes.find(s => s.id === sceneId);
                        
                        if (scene) {
                            scene.chapterId = targetChapId;
                            scene.plotId = targetPlotId;
                            self.render();
                            self.showNotification('Escena movida', 'success');
                        }
                    }
                }
            } else if (type === 'plot-header') {
                const targetHeader = e.target.closest('.plot-header');
                if (targetHeader) {
                    const fromPlotId = e.dataTransfer.getData('plotId');
                    const toPlotId = targetHeader.dataset.plotId;
                    
                    if (fromPlotId && toPlotId && fromPlotId !== toPlotId) {
                        self.reorderPlots(fromPlotId, toPlotId);
                    }
                }
            }
        });
    }

    setupGroupDragAndDrop() {
        const groupHeaders = document.querySelectorAll('.group-header');
        
        groupHeaders.forEach(header => {
            header.draggable = true;
            
            header.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                const groupType = header.classList.contains('character-group') ? 'character' : 'story';
                const groupName = header.querySelector('.group-header-content span')?.textContent?.trim() || '';
                
                e.dataTransfer.setData('type', 'group');
                e.dataTransfer.setData('groupType', groupType);
                e.dataTransfer.setData('groupName', groupName);
                e.dataTransfer.effectAllowed = 'move';
                
                setTimeout(() => header.classList.add('dragging'), 0);
            });
            
            header.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
                header.style.opacity = '0.7';
            });
            
            header.addEventListener('dragend', () => {
                header.classList.remove('dragging');
                header.style.opacity = '1';
            });
            
            header.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                header.style.opacity = '1';
                
                const type = e.dataTransfer.getData('type');
                
                if (type === 'group') {
                    const fromGroupType = e.dataTransfer.getData('groupType');
                    const fromGroupName = e.dataTransfer.getData('groupName');
                    const toGroupType = header.classList.contains('character-group') ? 'character' : 'story';
                    const toGroupName = header.querySelector('.group-header-content span')?.textContent?.trim() || '';
                    
                    if (fromGroupType === 'character' && toGroupType === 'character') {
                        this.reorderCharacterGroups(fromGroupName, toGroupName);
                    } else {
                        this.showNotification('Solo se pueden reordenar grupos del mismo tipo', 'info');
                    }
                }
            });
        });
    }

    reorderCharacterGroups(fromGroupName, toGroupName) {
        let fromChar = null;
        let toChar = null;
        
        this.state.characters.forEach(char => {
            if (char.name === fromGroupName || fromGroupName.includes(char.name)) {
                fromChar = char;
            }
            if (char.name === toGroupName || toGroupName.includes(char.name)) {
                toChar = char;
            }
        });
        
        if (fromChar && toChar && fromChar.id !== toChar.id) {
            const fromIndex = this.state.characters.indexOf(fromChar);
            const toIndex = this.state.characters.indexOf(toChar);
            
            const [moved] = this.state.characters.splice(fromIndex, 1);
            this.state.characters.splice(toIndex, 0, moved);
            
            this.render();
            this.showNotification(`Grupo "${fromChar.name}" movido después de "${toChar.name}"`, 'success');
            this.autoSave();
        }
    }

    reorderPlots(fromPlotId, toPlotId) {
        const fromIndex = this.state.plots.findIndex(p => p.id === fromPlotId);
        const toIndex = this.state.plots.findIndex(p => p.id === toPlotId);
        
        if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
            const [moved] = this.state.plots.splice(fromIndex, 1);
            this.state.plots.splice(toIndex, 0, moved);
            this.render();
            this.showNotification('Trama reordenada', 'success');
            this.autoSave();
        }
    }

    closeModal() {
        const modal = document.getElementById('modal-overlay');
        if (modal) modal.style.display = 'none';
        const confirmBtn = document.getElementById('modal-confirm');
        if (confirmBtn) {
            confirmBtn.style.display = 'block';
            confirmBtn.onclick = null;
        }
    }

    closeModalQuiet() {
        const modal = document.getElementById('modal-overlay');
        if (modal) modal.style.display = 'none';
    }
}

// Inicializar la aplicación global
const app = new PlotGridApp();