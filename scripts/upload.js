
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const TOKEN = ''; // Eliminado por seguridad
const REPO = 'danielmax2219/semapach-mantenimiento';
const BRANCH = 'main';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function githubRequest(endpoint, options = {}, retries = 3) {
    try {
        const res = await fetch(`https://api.github.com/repos/${REPO}${endpoint}`, {
            headers: {
                'Authorization': `token ${TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'Antigravity-Uploader'
            },
            ...options
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(`GitHub API error: ${res.status} - ${err}`);
        }
        return res.json();
    } catch (e) {
        if (retries > 0 && e.message.includes('fetch failed')) {
            console.log(`Error en fetch para ${endpoint}, reintentando... (${retries} restantes)`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return githubRequest(endpoint, options, retries - 1);
        }
        throw e;
    }
}

async function upload() {
    console.log('--- Starting Manual Upload to GitHub via API ---');
    
    // 1. Get current branch ref
    let shaBase;
    try {
        const ref = await githubRequest(`/git/ref/heads/${BRANCH}`);
        shaBase = ref.object.sha;
    } catch (e) {
        // Branch might not exist yet, initialize it
        console.log('Branch not found, initializing...');
    }

    const filesToUpload = [
        'index.html',
        'package.json',
        'package-lock.json',
        'tsconfig.json',
        'vite.config.ts',
        'server/database.ts',
        'server/index.ts',
        'server/schema.sql',
        'server/seed.ts',
        'server/routes/assets.ts',
        'server/routes/catalogs.ts',
        'server/routes/dailyRecords.ts',
        'server/routes/diagnosis.ts',
        'server/routes/failures.ts',
        'server/routes/kpi.ts',
        'server/routes/operators.ts',
        'server/routes/preventive.ts',
        'server/routes/water.ts',
        'src/App.tsx',
        'src/api/client.ts',
        'src/index.css',
        'src/main.tsx',
        'src/models/types.ts',
        'src/pages/APMDesempenio.tsx',
        'src/pages/Catalogos.tsx',
        'src/pages/DashboardGerencial.tsx',
        'src/pages/DashboardOperativo.tsx',
        'src/pages/DiagnosticoInicial.tsx',
        'src/pages/GestionPreventivos.tsx',
        'src/pages/MaestroActivos.tsx',
        'src/pages/MonitoreoAgua.tsx',
        'src/pages/MotorInteligencia.tsx',
        'src/pages/RegistroDiario.tsx',
        'src/pages/RegistroFallas.tsx',
        'src/pages/Reportes.tsx',
        'src/pages/ControlPTAP.tsx',
        'src/vite-env.d.ts',
        'src/components/water/CalculadoraDosis.tsx',
        'src/components/water/CronogramaSemanal.tsx',
        'src/components/water/ControlProceso.tsx',
        'src/components/water/ConsumoCloro.tsx',
        'src/components/ptap/CalculadoraDosis.tsx',
        'src/components/ptap/CronogramaSemanal.tsx',
        'src/components/ptap/ControlProceso.tsx',
        'src/components/ptap/ConsumoCloro.tsx',
        'src/components/ptap/DashboardPTAP.tsx',
        'src/data/tablas_dosificacion.json',
        'public/favicon.svg',
        'docs/plans/2026-03-11-control-monitoreo-agua-design.md',
        'docs/plans/2026-03-11-monitoreo-agua-plan.md'
    ];

    const treeData = [];
    for (const file of filesToUpload) {
        const fullPath = path.join(__dirname, file);
        if (fs.existsSync(fullPath)) {
            console.log(`Uploading blob: ${file}`);
            const content = fs.readFileSync(fullPath);
            const blob = await githubRequest('/git/blobs', {
                method: 'POST',
                body: JSON.stringify({
                    content: content.toString('base64'),
                    encoding: 'base64'
                })
            });
            treeData.push({
                path: file.replace(/\\/g, '/'),
                mode: '100644',
                type: 'blob',
                sha: blob.sha
            });
            console.log(`Blob OK: ${file}`);
        }
    }

    console.log('Creating tree...');
    const tree = await githubRequest('/git/trees', {
        method: 'POST',
        body: JSON.stringify({
            base_tree: shaBase,
            tree: treeData
        })
    });

    console.log('Creating commit...');
    const commit = await githubRequest('/git/commits', {
        method: 'POST',
        body: JSON.stringify({
            message: 'Fix: correcciones en dashboard PTAP y control de calendario',
            tree: tree.sha,
            parents: shaBase ? [shaBase] : []
        })
    });

    console.log('Updating ref...');
    await githubRequest(`/git/refs/heads/${BRANCH}`, {
        method: shaBase ? 'PATCH' : 'POST',
        body: JSON.stringify({
            sha: commit.sha,
            force: true,
            ref: shaBase ? undefined : `refs/heads/${BRANCH}`
        })
    });

    console.log('SUCCESS! Code uploaded to GitHub.');
}

upload().catch(err => {
    console.error('Upload failed:', err);
    process.exit(1);
});
