const fs = require('fs');
const path = require('path');
const { sites_path } = require('./utils');

function get_files(files = {}) {
    let result = {};
    for (let file in files) {
        let info = files[file];
        try {
            let asset_path = '/' + path.relative(sites_path, file);
            if (info && info.entryPoint && info.inputs && Object.keys(info.inputs).length !== 0) {
                for (let input in info.inputs) {
                    if (input.includes('.vue?type=style')) {
                        let bundle_css = path.basename(info.entryPoint).replace('.js', '.css');
                        result[asset_path] = bundle_css;
                        break;
                    }
                }
            }
        } catch (e) {
            console.warn('Error processing file:', file, e.message);
        }
    }
    return result;
}

module.exports = {
    name: 'frappe-vue-style',
    setup(build) {
        build.initialOptions.write = false;
        
        build.onEnd((result) => {
            if (!result || !result.metafile || !result.metafile.outputs || !result.outputFiles) {
                console.warn('Build result is incomplete, skipping style processing');
                return;
            }

            let files = get_files(result.metafile.outputs);
            let keys = Object.keys(files);
            
            for (let i = 0; i < result.outputFiles.length; i++) {
                let out = result.outputFiles[i];
                try {
                    let asset_path = '/' + path.relative(sites_path, out.path);
                    let dir = path.dirname(out.path);
                    
                    if (out.path.endsWith('.js') && keys.includes(asset_path)) {
                        let name = out.path.split('.bundle.')[0];
                        name = path.basename(name);

                        let cssIndex = result.outputFiles.findIndex((f) => 
                            f.path.endsWith('.css') && f.path.includes(/.bundle.)
                        );

                        if (cssIndex !== -1) {
                            let css_data = JSON.stringify(result.outputFiles[cssIndex].text);
                            let modified = rappe.dom.set_style();\n;
                            out.contents = Buffer.from(modified);
                            
                            // Remove the CSS file
                            result.outputFiles.splice(cssIndex, 1);
                            
                            // Remove corresponding sourcemap if exists
                            if (cssIndex > 0 && result.outputFiles[cssIndex - 1].path.endsWith('.css.map')) {
                                result.outputFiles.splice(cssIndex - 1, 1);
                                i -= 2; // Adjust index since we removed two items
                            } else {
                                i--; // Adjust index since we removed one item
                            }
                        }
                    }

                    if (!fs.existsSync(dir)) {
                        fs.mkdirSync(dir, { recursive: true });
                    }
                    
                    fs.writeFileSync(out.path, out.contents);
                } catch (e) {
                    console.warn('Error processing output file:', out.path, e.message);
                }
            }
        });
    }
};
