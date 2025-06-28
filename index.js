const express = require('express');
const path = require('path');
const fs = require('fs');
const sass = require('sass');

const app = express();
const port = 8080;
const obGlobal = {
    obErori: null,
    folderScss: path.join(__dirname, "Resurse", "scss"),
    folderCss: path.join(__dirname, "Resurse", "css")
};

console.log("Calea folderului unde se afla index.js (__dirname):", __dirname);
console.log("Calea fisierului index.js (__filename):", __filename);
console.log("Folderul curent de lucru (process.cwd()):", process.cwd());
// Nu, nu sunt intotdeauna acelasi lucru. 
// __dirname este calea folderului unde se afla fisierul care este apelat (adica index.js in acest caz).
// process.cwd() este cealea folderului curent de lucru
app.use('/resurse', express.static(path.join(__dirname, 'Resurse')));
app.get("/favicon.ico", function(req, res){
    res.sendFile(path.join(__dirname, "resurse/ico/favicon.ico"))
})
app.set('view engine', 'ejs');

function initErori(){
    try {
        let continut = fs.readFileSync(path.join(__dirname,"resurse/json/erori.json")).toString("utf-8");
        console.log(continut)
        obGlobal.obErori=JSON.parse(continut)
        console.log(obGlobal.obErori)
        
        obGlobal.obErori.eroare_default.imagine=path.join(obGlobal.obErori.cale_baza, obGlobal.obErori.eroare_default.imagine)
        for (let eroare of obGlobal.obErori.info_erori){
            eroare.imagine=path.join(obGlobal.obErori.cale_baza, eroare.imagine)
        }
        console.log(obGlobal.obErori)
    }
    catch (err) {
        console.error("Nu s-a putut initializa fisierul de erori.", err);
        process.exit(1);
    }
}

initErori()

function afisareEroare(res, identificator, titlu, text, imagine){
    let eroare= obGlobal.obErori.info_erori.find(function(elem){ 
                        return elem.identificator==identificator
                    });
    if(eroare){
        if(eroare.status)
            res.status(identificator)
        var titluCustom=titlu || eroare.titlu;
        var textCustom=text || eroare.text;
        var imagineCustom=imagine || eroare.imagine;
    }
    else{
        var err=obGlobal.obErori.eroare_default
        var titluCustom=titlu || err.titlu;
        var textCustom=text || err.text;
        var imagineCustom=imagine || err.imagine;
    }
    res.render("pagini/eroare", {
        titlu: titluCustom,
        text: textCustom,
        imagine: imagineCustom
    });
}

function compileazaScss(caleScss, caleCss) {
    if (!caleCss) {
        let numeFisExt=path.basename(caleScss);
        let numeFis=numeFisExt.split(".")[0] ;
        caleCss=numeFis+".css";
    }

    if (!path.isAbsolute(caleScss)) {
        caleScss = path.join(obGlobal.folderScss, caleScss);
    }
    if (!path.isAbsolute(caleCss)) {
        caleCss = path.join(obGlobal.folderCss, caleCss);
    }
    
    const caleBackup = path.join(__dirname, "backup", "resurse", "css");
    if (fs.existsSync(caleCss)) {
        try {
            if(!fs.existsSync(caleBackup))
                fs.mkdirSync(caleBackup, { recursive: true });
            const numeFisierCss = path.basename(caleCss);
            fs.copyFileSync(caleCss, path.join(caleBackup, numeFisierCss));
            console.log(`Backup creat pentru ${numeFisierCss}`);
        } catch (err) {
            console.error(`Eroare la crearea backup-ului pentru ${caleCss}:`, err);
        }
    }

    try {
        const rezultat = sass.compile(caleScss, {"sourceMap":true});
        fs.writeFileSync(caleCss, rezultat.css);
        console.log(`Fisierul ${caleScss} a fost compilat cu succes in ${caleCss}`);
    } catch (err) {
        console.error(`Eroare la compilarea ${caleScss}:`, err.message);
    }
}

vFisiere=fs.readdirSync(obGlobal.folderScss);
for( let numeFis of vFisiere ){
    if (path.extname(numeFis)==".scss"){
        compileazaScss(numeFis);
    }
}

fs.watch(obGlobal.folderScss, function(eveniment, numeFis){
    console.log(eveniment, numeFis);
    if (eveniment=="change" || eveniment=="rename"){
        let caleCompleta=path.join(obGlobal.folderScss, numeFis);
        if (fs.existsSync(caleCompleta)){
            compileazaScss(caleCompleta);
        }
    }
})

vect_foldere=["temp", "backup"]
for (let folder of vect_foldere ){
    let caleFolder=path.join(__dirname,folder)
    if (!fs.existsSync(caleFolder)){
        fs.mkdirSync(caleFolder);
    }
}

app.get(/^\/resurse\/[a-zA-Z0-9_\/]*$/, function(req, res, next){
    afisareEroare(res,403);
})

app.get("/{*any}.ejs", function(req, res, next){
    afisareEroare(res,400);
})

app.get(["/","/index","/home"], function(req, res){
    res.render("pagini/index",{ip:req.ip});
})

app.get("/server", function(req, res) {
    if(true===false){
        res.render("pagini/server");
    }
    else{
        afisareEroare(res, 500);
    }        
});

app.get("/{*any}", function(req, res, next){
    try{
        res.render("pagini"+req.url,function (err, rezultatRandare){
            if (err){
                if(err.message.startsWith("Failed to lookup view")){
                    afisareEroare(res,404);
                }
                else{
                    afisareEroare(res);
                }
            }
            else{
                console.log(rezultatRandare);
                res.send(rezultatRandare)
            }
        });
    }
    catch(errRandare){
        if(errRandare.message.startsWith("Cannot find module")){
            afisareEroare(res,404);
        }
        else{
            afisareEroare(res);
        }
    }
})

app.listen(port, () => {
    console.log(`Serverul a pornit pe portul ${port}`);
});