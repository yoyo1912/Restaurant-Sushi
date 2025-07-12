const express = require('express');
const path = require('path');
const fs = require('fs');
const sass = require('sass');
const sharp = require('sharp');

const app = express();
const port = 8080;
const obGlobal = {
    obErori: null,
    obGalerie: null,
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
app.get("/favicon.ico", function (req, res) {
    res.sendFile(path.join(__dirname, "resurse/ico/favicon.ico"))
})
app.set('view engine', 'ejs');

function initErori() {
    try {
        let continut = fs.readFileSync(path.join(__dirname, "resurse/json/erori.json")).toString("utf-8");
        console.log(continut)
        obGlobal.obErori = JSON.parse(continut)
        console.log(obGlobal.obErori)

        obGlobal.obErori.eroare_default.imagine = path.join(obGlobal.obErori.cale_baza, obGlobal.obErori.eroare_default.imagine)
        for (let eroare of obGlobal.obErori.info_erori) {
            eroare.imagine = path.join(obGlobal.obErori.cale_baza, eroare.imagine)
        }
        console.log(obGlobal.obErori)
    }
    catch (err) {
        console.error("Nu s-a putut initializa fisierul de erori.", err);
        process.exit(1);
    }
}

initErori()

function afisareEroare(res, identificator, titlu, text, imagine) {
    let eroare = obGlobal.obErori.info_erori.find(function (elem) {
        return elem.identificator == identificator
    });
    if (eroare) {
        if (eroare.status)
            res.status(identificator)
        var titluCustom = titlu || eroare.titlu;
        var textCustom = text || eroare.text;
        var imagineCustom = imagine || eroare.imagine;
    }
    else {
        var err = obGlobal.obErori.eroare_default
        var titluCustom = titlu || err.titlu;
        var textCustom = text || err.text;
        var imagineCustom = imagine || err.imagine;
    }
    res.render("pagini/eroare", {
        titlu: titluCustom,
        text: textCustom,
        imagine: imagineCustom
    });
}

function compileazaScss(caleScss, caleCss) {
    if (!caleCss) {
        let numeFisExt = path.basename(caleScss);
        let numeFis = numeFisExt.split(".")[0];
        caleCss = numeFis + ".css";
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
            if (!fs.existsSync(caleBackup))
                fs.mkdirSync(caleBackup, { recursive: true });

            const numeFisierCss = path.basename(caleCss);
            const extFisier = path.extname(numeFisierCss);
            const numeFaraExt = path.basename(numeFisierCss, extFisier);
            const timestamp = Date.now();
            const numeBackup = `${numeFaraExt}_${timestamp}${extFisier}`;

            fs.copyFileSync(caleCss, path.join(caleBackup, numeBackup));
            console.log(`Backup creat pentru ${numeBackup}`);
        } catch (err) {
            console.error(`Eroare la crearea backup-ului pentru ${caleCss}:`, err);
        }
    }

    try {
        const rezultat = sass.compile(caleScss, { "sourceMap": true });
        fs.writeFileSync(caleCss, rezultat.css);
        console.log(`Fisierul ${caleScss} a fost compilat cu succes in ${caleCss}`);
    } catch (err) {
        console.error(`Eroare la compilarea ${caleScss}:`, err.message);
    }
}

function initGalerie() {
    const continut = fs.readFileSync(path.join(__dirname, "resurse/json/galerie.json")).toString("utf-8");
    obGlobal.obGalerie = JSON.parse(continut);
}

function getAnotimp() {
    const d = new Date();
    // Pentru testare:
    // const d = new Date("2025-01-15");
    const luna = d.getMonth();
    if (luna >= 3 && luna <= 5) return "primavara";
    if (luna >= 6 && luna <= 8) return "vara";
    if (luna >= 9 && luna <= 11) return "toamna";
    return "iarna";
}

initGalerie();

function getRandomPowerOfTwo(min, max) {
    const powers = [];
    for (let i = min; i <= max; i++) {
        let pow = 2 ** i;
        if (pow > 1 && pow < 17) powers.push(pow);
    }
    const index = Math.floor(Math.random() * powers.length);
    return powers[index];
}

vFisiere = fs.readdirSync(obGlobal.folderScss);
for (let numeFis of vFisiere) {
    if (path.extname(numeFis) == ".scss") {
        compileazaScss(numeFis);
    }
}

fs.watch(obGlobal.folderScss, function (eveniment, numeFis) {
    console.log(eveniment, numeFis);
    if (eveniment == "change" || eveniment == "rename") {
        let caleCompleta = path.join(obGlobal.folderScss, numeFis);
        if (fs.existsSync(caleCompleta)) {
            compileazaScss(caleCompleta);
        }
    }
})

vect_foldere = ["temp", "backup"]
for (let folder of vect_foldere) {
    let caleFolder = path.join(__dirname, folder)
    if (!fs.existsSync(caleFolder)) {
        fs.mkdirSync(caleFolder);
    }
}

app.get(/^\/resurse\/[a-zA-Z0-9_\/]*$/, function (req, res, next) {
    afisareEroare(res, 403);
})

app.get("/{*any}.ejs", function (req, res, next) {
    afisareEroare(res, 400);
})

app.get('/Resurse/imagini/galerie/mediu/:dim/:imagine', (req, res) => {
    let dim = req.params.dim;
    let imagine = req.params.imagine;

    let latime;
    if (dim === "small") latime = 300;
    else if (dim === "medium") latime = 500;
    else { afisareEroare(res, 400, "Dimensiune invalida"); return; }

    let caleImagineOrig = path.join(__dirname, "/Resurse/imagini/galerie", imagine);
    let caleImagineRedim = path.join(__dirname, "/Resurse/imagini/galerie/mediu", dim, imagine);

    if (fs.existsSync(caleImagineRedim)) {
        res.sendFile(caleImagineRedim);
    } else if (fs.existsSync(caleImagineOrig)) {
        sharp(caleImagineOrig).resize(latime).toFile(caleImagineRedim)
            .then(() => {
                res.sendFile(caleImagineRedim);
            })
            .catch(err => {
                console.error("Eroare la redimensionare:", err);
                afisareEroare(res, 500, "Eroare procesare imagine");
            });
    } else {
        afisareEroare(res, 404, "Imaginea originala nu exista");
    }
});

app.get(["/", "/index", "/home"], function (req, res) {
    const anotimpCurent = getAnotimp();
    const imaginiDeAfisat = obGlobal.obGalerie.imagini
        .filter(img => img.anotimp === anotimpCurent)
        .slice(0, 10);
    const nrImgAnim = getRandomPowerOfTwo(1, 4);
    const imaginiAnim = obGlobal.obGalerie.imagini
        .filter((img, idx) => idx % 2 === 0)
        .slice(0, nrImgAnim);
    res.render("pagini/index", {
        ip: req.ip,
        imagini: imaginiDeAfisat,
        imaginiAnim: imaginiAnim,
        obGlobal: obGlobal
    });
})

app.get("/galerie", (req, res) => {
    const anotimpCurent = getAnotimp();
    const imaginiDeAfisat = obGlobal.obGalerie.imagini
        .filter(img => img.anotimp === anotimpCurent)
        .slice(0, 10);

    res.render("pagini/galerie", {
        imagini: imaginiDeAfisat,
        obGlobal: obGlobal
    });
});

app.get("/server", function (req, res) {
    if (true === false) {
        res.render("pagini/server");
    }
    else {
        afisareEroare(res, 500);
    }
});

app.get("/{*any}", function (req, res, next) {
    try {
        res.render("pagini" + req.url, function (err, rezultatRandare) {
            if (err) {
                if (err.message.startsWith("Failed to lookup view")) {
                    afisareEroare(res, 404);
                }
                else {
                    afisareEroare(res);
                }
            }
            else {
                console.log(rezultatRandare);
                res.send(rezultatRandare)
            }
        });
    }
    catch (errRandare) {
        if (errRandare.message.startsWith("Cannot find module")) {
            afisareEroare(res, 404);
        }
        else {
            afisareEroare(res);
        }
    }
})

app.listen(port, () => {
    console.log(`Serverul a pornit pe portul ${port}`);
});