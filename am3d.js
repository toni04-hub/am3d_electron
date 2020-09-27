const cv = require("./js/opencv.js");
var fs = require('fs');
var remote = require('electron').remote;
var dialog = remote.dialog;
var app = remote.app;
var docsDir = app.getPath('documents') + '/Am3D/models/';
var projectionsDir = app.getPath('documents') + '/Am3D/projections/';

let scene, camera, renderer, controls;
let w = window.innerWidth;
let h = window.innerHeight;

let topCamera, frontCamera, latCamera;

const log = document.getElementById('console');
const container = document.getElementById('container');
const spinner = document.getElementById('loader');

const btNextFile = document.getElementById("nextFile");
btNextFile.addEventListener('click', setModel);

const btInput = document.getElementById('pickFile');
btInput.addEventListener('change', openFiles, false);

const btResetMarkers = document.getElementById("resetMarkers");
btResetMarkers.addEventListener("click", resetMarkers);

const btGuardar = document.getElementById("guardar");
btGuardar.addEventListener("click", guardar);

const layers = document.getElementById("layers");

const projFrontal = document.getElementById("projFrontal");
const projSuperior = document.getElementById("projSuperior");
const projLateral = document.getElementById("projLateral");

let files;
let nTalls = 3;
let currentFile = 0;

var model = {
    mesh: null,
    material: null,
    bBox: null,
    boxHelper: null,
    markers: [],
    light: null,
    nom: null,
    dimensions: {
        altura_botanica: null,
        altura: null,
        amplada: null,
        gruixa: null
    },
    volum: null,
    area: null,
    centreDeMassa: null,
    convexHull: {
        mesh: null,
        material: null,
        volum: null,
        area: null
    },
    esfera: {
        mesh: null,
        meterial: null,
        volum: null,
        area: null
    },
    contorns: {
        frontal: [],
        superior: [],
        lateral: []
    },
    seccions: {
        x: [],
        y: [],
        z: []
    },
    projeccions: {
        top: null,
        front: null,
        lat: null
    }
}


var info = {
    altBot: document.getElementById("altBot").querySelector("span"),
    alt: document.getElementById("alt").querySelector("span"),
    ample: document.getElementById("ample").querySelector("span"),
    gruix: document.getElementById("gruix").querySelector("span"),
    area: document.getElementById("area").querySelector("span"),
    volum: document.getElementById("volum").querySelector("span"),
    cm: document.getElementById("cm").querySelector("span"),
    re: document.getElementById("re").querySelector("span"),
    ve: document.getElementById("ve").querySelector("span"),
    cg: document.getElementById("cg").querySelector("span"),
}


function init() {
    initMenu();
    initScene();
    initCameras();
    initLigths();
    initControls();
    initGrid();
    checkDirs();
    initModel();
    
}

init();

function initMenu() {
    btNextFile.disabled = true;
    btNextFile.parentNode.querySelector("i").classList.add("disabled");
    document.getElementById("layers").style.visibility = "hidden";
}

function initScene() {
    log.textContent = "carregant scena..."
    scene = new THREE.Scene();
    scene.background = new THREE.Color("#000000");

    //initialice renderer................................................
    renderer = new THREE.WebGLRenderer({
        antialias: true
    });

    renderer.setSize(w, h);
    container.appendChild(renderer.domElement);

    renderer.domElement.addEventListener("dblclick", setOrientation);

    log.textContent = "Scena carregada correctament";

}

function checkDirs() {
    checkDir(docsDir);
    checkDir(projectionsDir);
}

function checkDir(dir) {
    console.log("cheking directoris...")
    if (!fs.existsSync(dir)) {
        fs.mkdir(dir, {
            recursive: true
        }, function (err) {
            if (err) {
                console.log(err);
            } else {
                console.log("Folder " + dir + " created!");
            }
        });

    } else {
        console.log("Folder " + dir + " exists");
    }
}

function initCameras() {
    //initialize cameras................................................
    camera = new THREE.PerspectiveCamera(30, w / h, 1, 1000);
    camera.position.set(0, 60, 120);

    frontCamera = new THREE.OrthographicCamera(-25, 25, 25, -25, 10, 2000);
    frontCamera.position.set(0, 0, 80);
    frontCamera.up.set(0, 1, 0);
    frontCamera.lookAt(new THREE.Vector3(0, 0, 0));
    frontCamera.layers.set(1);

    topCamera = new THREE.OrthographicCamera(-25, 25, 25, -25, 10, 2000);
    topCamera.position.set(0, 80, 0);
    topCamera.up.set(0, 0, -1);
    topCamera.lookAt(new THREE.Vector3(0, 0, 0));
    topCamera.layers.set(2);

    latCamera = new THREE.OrthographicCamera(-25, 25, 25, -25, 10, 2000);
    latCamera.position.set(80, 0, 0);
    latCamera.up.set(0, 1, 0);
    latCamera.lookAt(new THREE.Vector3(0, 0, 0));
    latCamera.layers.set(3);

}

function initLigths() {
    
    model.light = new THREE.HemisphereLight(0xAAAAAA, 0x000000, 1);
    model.light.position.set(0, 0, 1).normalize();
    //model.light.layers.enable(1);
    camera.add(model.light);
    scene.add(camera);

    var frontLight = new THREE.HemisphereLight(0xAAAAAA, 0x000000, 1);
    frontLight.position.set(0, 0, 1).normalize();
    frontLight.layers.set(1);
    frontCamera.add(frontLight);
    scene.add(frontCamera);

    var topLight = new THREE.HemisphereLight(0xAAAAAA, 0x000000, 1);
    topLight.position.set(0, 1, 0).normalize();
    topLight.layers.set(2);
    topCamera.add(topLight);
    scene.add(topCamera);

    var latLight = new THREE.HemisphereLight(0xAAAAAA, 0x000000, 1);
    latLight.position.set(1, 0, 0).normalize();
    latLight.layers.set(3);
    latCamera.add(latLight);
    scene.add(latCamera);

}

function initControls() {
    //init controls................................................
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enablePan = true;
    controls.addEventListener('change', render);

}

function initGrid() {
    //show grid................................................
    var size = 80;
    var divisions = 10;

    var gridHelper = new THREE.GridHelper(size, divisions);
    scene.add(gridHelper);

    var axesHelper = new THREE.AxesHelper(100);
    scene.add(axesHelper);
    render();
}

function initModel() {
    if (!model.mesh) {
        model.mesh = new THREE.Mesh();
        model.mesh.material = new THREE.MeshLambertMaterial({
            color: 0xffffff
        });
        model.mesh.name = "ametlla";
    }
}

//render function................................................
function render() {
    renderer.render(scene, camera);
}


//function openFiles................................................
function openFiles(evt) {
    log.textContent = "carregant model STL ..."
    files = evt.target.files;
    currentFile = 0;
    setModel();
};

function setModel() {
    spinner.style.display = "block";
    spinner.querySelector("p").innerHTML = "Carregant...";

    if (model.mesh) {
        scene.remove(model.mesh);
    }

    btNextFile.disabled = true;
    btNextFile.parentNode.querySelector("i").classList.add("disabled");

    resetMarkers();


    let reader = new FileReader();

    reader.onload = function () {
        var loader = new THREE.STLLoader();

        // parse the .stl file
        model.mesh.geometry = loader.parse(this.result);
        //Center the geometry based on the bounding box.
        //model.mesh.geometry.center();
        model.mesh.geometry.computeBoundingBox();
        model.mesh.layers.enable(1);
        model.mesh.layers.enable(2);
        model.mesh.layers.enable(3);

        scene.add(model.mesh);

        log.textContent = "Model " + model.name + " carregat."
        spinner.style.display = "none";
        console.log("Model " + model.name + " carregat.");


        render();

    };

    // --> update here
    controls.target = new THREE.Vector3(0, 0, 0);
    controls.update();

    if (files[currentFile]) {
        model.name = files[currentFile].name.slice(0, -4);
        reader.readAsArrayBuffer(files[currentFile]);
       
    } else {
        spinner.style.display = "none";
        console.log("Selecciona un arxiu stl");
    }

    if (currentFile != files.length - 1) {
        btNextFile.disabled = false;
        btNextFile.parentNode.querySelector("i").classList.remove("disabled");
    }
    currentFile++;

};

function clearScene() {

}
function centerModel(){
    model.mesh.geometry.center();
    console.log("model centrat correctamant");
    render();
}

var intscs = [];
var rc = new THREE.Raycaster();
var m = new THREE.Vector2();
var poi = new THREE.Vector3();
var markers = [];
var nMarkers = 0;
var pos = new THREE.Vector3();
var tp = [
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3()
];



function setPos(faceIndex) {

    var tri = new THREE.Triangle();
    var bc = new THREE.Vector3();
    var idx = 0;

    tp[0].fromBufferAttribute(intscs[0].object.geometry.attributes.position, faceIndex * 3 + 0);
    tp[1].fromBufferAttribute(intscs[0].object.geometry.attributes.position, faceIndex * 3 + 1);
    tp[2].fromBufferAttribute(intscs[0].object.geometry.attributes.position, faceIndex * 3 + 2);
    tri.set(tp[0], tp[1], tp[2]);
    tri.getBarycoord(poi, bc);
    if (bc.x > bc.y && bc.x > bc.z) {
        idx = 0;
    } else if (bc.y > bc.x && bc.y > bc.z) {
        idx = 1;
    } else if (bc.z > bc.x && bc.z > bc.y) {
        idx = 2;
    }
    pos.copy(tp[idx]);
}

function setOrientation(event) {
    console.log("model.markers");
    console.log(model.markers);
    console.log("markers");
    console.log(markers);
    if (nMarkers < 3) {

        m.x = ((event.clientX) / w) * 2 - 1;
        m.y = -((event.clientY) / h) * 2 + 1;

        rc.setFromCamera(m, camera);
        intscs = rc.intersectObject(model.mesh);
        if (intscs.length > 0) {

            var marker = new THREE.Mesh(new THREE.SphereBufferGeometry(0.2, 12, 12), new THREE
                .MeshBasicMaterial({
                    color: 0xFF0000,

                }));

            marker.position.setScalar(1000);

            scene.add(marker);
            model.markers.push(marker);

            let o = intscs[0];
            poi.copy(o.point);

            setPos(o.faceIndex);

            o.object.localToWorld(pos);
            marker.position.copy(pos);

            markers[nMarkers] = new THREE.Vector3().copy(pos);

            var matrix = new THREE.Matrix4();
            var or = new THREE.Vector3(0, 1, 0);
            var dir_ = new THREE.Vector3();
            var quaternion = new THREE.Quaternion();

            if (nMarkers == 0) {

                matrix.makeTranslation(-markers[0].x, -markers[0].y, -markers[0].z);
                model.mesh.geometry.applyMatrix(matrix);
                markers[0] = new THREE.Vector3(0, 0, 0);
                marker.position.copy(markers[0]);
                marker.name = "marker1";

            }

            if (nMarkers == 1) {

                dir_.subVectors(markers[1], markers[0]).normalize();
                quaternion.setFromUnitVectors(dir_, or);

                matrix.makeRotationFromQuaternion(quaternion);

                model.mesh.geometry.applyMatrix(matrix);
                markers[1] = new THREE.Vector3(0, markers[1].length(), 0);

                marker.position.copy(markers[1]);
                marker.name = "marker2";


            }

            if (nMarkers == 2) {

                quaternion.setFromUnitVectors(new THREE.Vector3(markers[2].x, 0, markers[2].z).normalize(),
                    new THREE.Vector3(1, 0, 0));
                matrix.makeRotationFromQuaternion(quaternion);

                model.mesh.geometry.applyMatrix(matrix);
                var l = new THREE.Vector3(markers[2].x, 0, markers[2].z).length();
                markers[2] = new THREE.Vector3(l, markers[2].y, 0);

                marker.position.copy(markers[2]);
                marker.name = "marker3";

                btResetMarkers.parentNode.querySelector("i").classList.remove("disabled");
                btGuardar.parentNode.querySelector("i").classList.remove("disabled");
                if (currentFile == 0 || currentFile != files.length) {
                    btNextFile.disabled = false;
                    btNextFile.parentNode.querySelector("i").classList.remove("disabled");
                }
                //setViews(model.mesh);
                centerCamera();

            }

            nMarkers++;
        }

        render();
    }
}

function setBoundingBox() {
    model.boxHelper = new THREE.BoxHelper(model.mesh, 0xffff00);
    scene.add(model.boxHelper);
    render();
}

//TODO ........ resetejar tota l'escena
function resetMarkers() {

    document.getElementById("layers").style.visibility = "hidden";

    for (d in model.dimensions) {
        model.dimensions[d] = "";
    }
    //TODO Fer Un recorregut millor resetjar el model i el block info amb una funció
    info.altBot.textContent = '';
    info.alt.textContent = '';
    info.ample.textContent = '';
    info.gruix.textContent = '';


    scene.remove(model.boxHelper);

    for (var i = 0; i < model.markers.length; i++) {
        scene.remove(model.markers[i]);
    }
    for (c in model.seccions.x) {
        scene.remove(model.seccions.x[c]);
    }
    model.seccions.x = [];
    for (c in model.seccions.y) {
        scene.remove(model.seccions.y[c]);
    }
    model.seccions.y = [];
    for (c in model.seccions.z) {
        scene.remove(model.seccions.z[c]);
    }
    model.seccions.z = [];
    btResetMarkers.parentNode.querySelector("i").classList.add("disabled");
    btGuardar.parentNode.querySelector("i").classList.add("disabled");

    nMarkers = 0;
    model.markers = [];

    render();

}




function volume_sphere(r) {
    var volume;
    var radius = r;
    radius = Math.abs(radius);
    volume = (4 / 3) * Math.PI * Math.pow(radius, 3);
    volume = volume;

    return volume;
}

function calculateContoursX(object, tall) {

    let pX = new THREE.Plane(new THREE.Vector3(1, 0, 0), tall);
    let cross = Calculate.crossSection(pX, object, false);
    let segments = cross[0].segments;
    let g = new THREE.Geometry();
    let v = g.vertices;
    for (let s = 0, l = segments.length; s < l; s++) {
        let segment = segments[s];
        v.push(segment.start);
        v.push(segment.end);
    }

    let material = new THREE.LineBasicMaterial({
        color: 0x0000ff
    });

    let tempSec = new THREE.LineSegments(g, material);
    tempSec.layers.enable(1);
    model.seccions.x.push(tempSec);
    for (c in model.seccions.x) {
        scene.add(model.seccions.x[c]);
    }
}

function calculateContoursY(object, tall) {

    let pX = new THREE.Plane(new THREE.Vector3(0, 1, 0), tall);
    let cross = Calculate.crossSection(pX, object, false);
    let segments = cross[0].segments;
    let g = new THREE.Geometry();
    let v = g.vertices;
    for (let s = 0, l = segments.length; s < l; s++) {
        let segment = segments[s];
        v.push(segment.start);
        v.push(segment.end);
    }


    let material = new THREE.LineBasicMaterial({
        color: 0xffff00
    });

    let tempSec = new THREE.LineSegments(g, material);
    tempSec.layers.enable(1);
    model.seccions.y.push(tempSec);
    for (c in model.seccions.y) {
        scene.add(model.seccions.y[c]);
    }
}

function calculateContoursZ(object, tall) {

    let pX = new THREE.Plane(new THREE.Vector3(0, 0, 1), tall);
    let cross = Calculate.crossSection(pX, object, false);
    let segments = cross[0].segments;
    let g = new THREE.Geometry();
    let v = g.vertices;

    for (let s = 0, l = segments.length; s < l; s++) {
        let segment = segments[s];
        v.push(segment.start);
        v.push(segment.end);
    }

    let material = new THREE.LineBasicMaterial({
        color: 0xff0000
    });
    let tempSec = new THREE.LineSegments(g, material);
    tempSec.layers.enable(1);
    model.seccions.z.push(tempSec);
    for (c in model.seccions.z) {
        scene.add(model.seccions.z[c]);
    }
}



function calculateCrossSections() {

    console.log("calculant seccions");
            
    let ini = model.mesh.geometry.boundingBox.min.x;
    let interval = model.dimensions.amplada / nTalls;
    let planeOfsset = null;
    for (var i = 0; i < nTalls; i++) {
        planeOfsset = ini + (interval * i) + interval / 2;
        calculateContoursX([model.mesh], -planeOfsset);
    }

    ini = -model.mesh.geometry.boundingBox.min.y;
    interval = model.dimensions.altura / nTalls;
    for (var i = 0; i < nTalls; i++) {
        planeOfsset = ini - (interval * i) - interval / 2;
        calculateContoursY([model.mesh], planeOfsset);
    }

    ini = model.mesh.geometry.boundingBox.min.z;
    interval = model.dimensions.gruixa / nTalls;
    for (var i = 0; i < nTalls; i++) {
        planeOfsset = ini + (interval * i) + interval / 2;
        calculateContoursZ([model.mesh], -planeOfsset);

    }

    console.log('seccion calculades correctament');

    log.textContent = "Sccions calculades correctament.";

    centerCamera();
  
    render();
    
    //console.log(scene.children);

}

function centerCamera() {
    var f = new THREE.Vector3();
    model.mesh.geometry.boundingBox.getCenter(f);
    camera.position.set(f.x, f.y, 80);
    camera.up.set(0, 1, 0);
    camera.lookAt(f);
    camera.updateProjectionMatrix();
    controls.target = f;
    controls.update();
}

function resetCamera() {
    w = window.innerWidth;
    h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    renderer.setSize(w, h);
    render();
}


window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {

    resetCamera();

}

var exporter = new THREE.STLExporter();

function guardar() {
    exportBinary();
}

function exportBinary() {
    var result = exporter.parse(model.mesh, {
        binary: true
    });
    saveArrayBuffer(result);

}

function saveArrayBuffer(buffer) {

    var fileName = model.name.split("_");

    var filePath = docsDir + fileName[0] + '/';
    console.log(filePath);

    if (!fs.existsSync(filePath)) {
        fs.mkdir(filePath, {
            recursive: true
        }, function (err) {
            if (err) {
                console.log(err);
            }
        });
    }

    try {
        fs.writeFileSync(filePath + model.name + '.stl', buffer);
        alert('model guardat correctament');
    } catch (e) {
        alert('Failed to save the file !');

        console.log(e)
    }

}


function setViews(mesh) {
    var layers = document.getElementById("layers");
    var showLayers = layers.style.visibility;
    //només recalculara si les mostram
    if (showLayers == 'hidden') {
        layers.style.visibility = 'visible';
    } else {
        layers.style.visibility = 'hidden';
        return;

    }

    //TODO Posible objecte vista?
    var top = document.getElementById("top");
    var front = document.getElementById("front");
    var lat = document.getElementById("lat");



    var imgTop = new Image();
    var imgFront = new Image();
    var imgLat = new Image();

    var c = new THREE.Vector3();
   
    mesh.geometry.boundingBox.getCenter(c);//La camera ha de mirar al centre de l'eix y
    
    
    console.log(mesh.geometry.boundingBox);
    frontCamera.position.set(0,0,80);
    frontCamera.up.set(0, 1, 0);
    frontCamera.lookAt(0,c.y, 0);
    frontCamera.updateProjectionMatrix();


    topCamera.position.set(c.x, 80, c.z);
    topCamera.up.set(0, 0, -1);
    topCamera.lookAt(0,c.y,0);
    topCamera.updateProjectionMatrix();

    latCamera.position.set(80, c.y, c.z);
    latCamera.up.set(0, 1, 0);
    latCamera.lookAt(0,c.y,0);
    latCamera.updateProjectionMatrix();

    renderer.setSize(1024, 1024);
    renderer.render(scene, frontCamera);
    imgFront.src = renderer.domElement.toDataURL();
    var frontCtx = front.getContext('2d');
    imgFront.onload = function () {
        frontCtx.drawImage(imgFront, 0, 0, 200, 200);
        model.imgFront = imgFront.src;
        setProjectionContour(imgFront, projFrontal);
    }

    renderer.render(scene, topCamera);
    imgTop.src = renderer.domElement.toDataURL();
    var topCtx = top.getContext('2d');
    imgTop.onload = function () {
        topCtx.drawImage(imgTop, 0, 0, 200, 200);
        model.imgTop = imgTop.src;
        setProjectionContour(imgTop, projSuperior);
    }

    renderer.render(scene, latCamera);
    imgLat.src = renderer.domElement.toDataURL();
    var latCtx = lat.getContext('2d');
    imgLat.onload = function () {
        latCtx.drawImage(imgLat, 0, 0, 200, 200);
        model.imgLat = imgLat.src;
        setProjectionContour(imgLat, projLateral);
    }

    renderer.setSize(w, h);
    render();


}




function setProjectionContour(c_in, c_out) {


    let src = cv.imread(c_in);
    let dsize = new cv.Size(200, 200);
    cv.resize(src, src, dsize, 0, 0, cv.INTER_AREA);
    let dst = cv.Mat.zeros(src.cols, src.rows, cv.CV_8UC3);
    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
    cv.threshold(src, src, 0, 255, cv.THRESH_BINARY);
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    // You can try more different parameters
    cv.findContours(src, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_NONE);
    const cnt = contours;
    // console.log(src.channels());
    // console.log(dst)
    // console.log(contours.get(0));
    // draw contours with random Scalar
    for (let i = 0; i < contours.size(); ++i) {
        let color = new cv.Scalar(255, 0, 0);
        cv.drawContours(dst, contours, i, color, 1, cv.LINE_8, hierarchy, 100);

    }


    var points = [];

    for (var y = 0; y < dst.rows; y++) {
        for (var x = 0; x < dst.cols; x++) {
            let pixel = dst.ucharPtr(y, x);
            let R = pixel[0];
            if (R > 0) {
                //console.log("x: "+x+"y: "+y);
                let center = new cv.Point(x, y);

                let radius = 1;
                if (y % 20 == 0)
                cv.circle(dst, center, radius, [0, 255, 0, 255], 1);
                points.push([x, y]);
                //console.log([x,y]);
            }
        }
    }
    


    let lineColor = new cv.Scalar(0, 0, 255);
    let point1 = new cv.Point(100, 0);
    let point2 = new cv.Point(100, 200);
    cv.line(dst, point1, point2, lineColor, 1);
    
    lineColor = new cv.Scalar(0, 0, 255);
    point1 = new cv.Point(0, 100);
    point2 = new cv.Point(200, 100);
    cv.line(dst, point1, point2, lineColor, 1)

    // You can try more different parameters
    let rotatedRect = cv.minAreaRect(contours.get(0));
    let vertices = cv.RotatedRect.points(rotatedRect);

    let rectangleColor = new cv.Scalar(255, 255, 255);

    // draw rotatedRect
    for (let i = 0; i < 4; i++) {
        cv.line(dst, vertices[i], vertices[(i + 1) % 4], rectangleColor, 1, cv.LINE_AA, 0);
    }


    let rect = cv.boundingRect(contours.get(0));
    rectangleColor = new cv.Scalar(255, 255, 0);
    point1 = new cv.Point(rect.x, rect.y);
    point2 = new cv.Point(rect.x + rect.width, rect.y + rect.height);
    cv.rectangle(dst, point1, point2, rectangleColor, 1, cv.LINE_AA, 0);

    lineColor = new cv.Scalar(0, 255, 255);
    point1 = new cv.Point(0, 500);
    point2 = new cv.Point(1000, 500);
    cv.line(dst, point1, point2, lineColor, 1)

    var pointsX = [];
    for (var i = 0; i < points.length; i++) {
        pointsX[i] = points[i][0];

    }
    //console.log(pointsX);
    let maxX = Math.max(...pointsX);
    let minX = Math.min(...pointsX);
    let maxPoint, minPoint;

    for (var i = 0; i < pointsX.length; i++) {
        if (points[i][0] === minX) {
            minPoint = points[i];

        }
        if (points[i][0] === maxX) {
            maxPoint = points[i];
        }
    }
    //console.log("min: " + minPoint + " max: " + maxPoint);

    lineColor = new cv.Scalar(255, 0, 255);
    point1 = new cv.Point(minPoint[0], maxPoint[1]);
    point2 = new cv.Point(maxPoint[0], maxPoint[1]);
    cv.line(dst, point1, point2, lineColor, 1);
    point1 = new cv.Point(minPoint[0], minPoint[1]);
    point2 = new cv.Point(maxPoint[0], minPoint[1]);
    cv.line(dst, point1, point2, lineColor, 1)



    cv.imshow(c_out, dst);
    src.delete();
    dst.delete();
}

function calculs() {

    model.bBox = new THREE.Vector3();
    model.mesh.geometry.boundingBox.getSize(model.bBox);

    model.dimensions.altura_botanica = model.bBox.y - model.dimensions.offsetY; //markers[1].length();
    model.dimensions.altura = model.bBox.y;
    model.dimensions.amplada = model.bBox.x;
    model.dimensions.gruixa = model.bBox.z;

    model.centreDeMassa = Calculate.centerOfMass(model.mesh);

    model.centreDeMassa.x = model.centreDeMassa.x;
    model.centreDeMassa.y = model.centreDeMassa.y;
    model.centreDeMassa.z = model.centreDeMassa.z;

    model.esfera.centre = model.mesh.geometry.boundingSphere.center;
    model.esfera.centre.x = parseFloat(model.esfera.centre.x);
    model.esfera.centre.y = model.esfera.centre.y;
    model.esfera.centre.z = model.esfera.centre.z;

    model.esfera.radi = model.mesh.geometry.boundingSphere.radius;
    model.esfera.volum = volume_sphere(model.esfera.radi);

    info.altBot.textContent = model.dimensions.altura_botanica + " mm";
    info.alt.textContent = model.dimensions.altura + " mm";
    info.ample.textContent = model.dimensions.amplada + "mm";
    info.gruix.textContent = model.dimensions.gruixa + "mm";

    info.cm.textContent = model.centreDeMassa.x + ',' + model.centreDeMassa.y + ',' + model.centreDeMassa.z;
    info.cg.textContent = model.esfera.centre.x + ',' + model.esfera.centre.y + ',' + model.esfera.centre.z;
    info.re.textContent = model.esfera.radi;
    info.ve.textContent = model.esfera.volum;
}

function computeHull() {
    if (model.mesh.geometry instanceof THREE.BufferGeometry) {
        let points = [];
        let positions = model.mesh.geometry.attributes["position"].array;
        let ptCout = positions.length / 3;
        for (let i = 0; i < ptCout; i++) {
            let p = new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
            points.push(p);
        }
        var geometry = new THREE.ConvexBufferGeometry(points);
        var material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true
        });
        var mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        render();
    }
}

function ocultarModel() {

    if (!model.mesh.visible) {
        model.mesh.visible = true;

    } else {
        model.mesh.visible = false;
    }

    render();
}

function toFloor() {
    let matrix = new THREE.Matrix4();
    //console.log(model.mesh.geometry);
    matrix.makeTranslation(0, -model.mesh.geometry.boundingBox.min.y, 0);
    model.mesh.geometry.applyMatrix(matrix);
/*

    let position = model.mesh.geometry.attributes.position;
    var va = new THREE.Vector3();
    var vb = new THREE.Vector3();
    var vc = new THREE.Vector3();
    let offsetX = 0;
    let offsetZ = 0;
    let offsetY = 0;
    for (var i = 0, l = position.count; i < l; i += 3) {
        va.fromBufferAttribute(position, i); //x
        //vb.fromBufferAttribute(position, i + 1);//y
        //vc.fromBufferAttribute(position, i + 2);//Z
        //console.log(va.x);
        if (va.y === model.mesh.geometry.boundingBox.max.y) {
            offsetX = va.x;
            offsetZ = va.z;
            console.log(offsetX);
            console.log(offsetZ);
            break;
        }



    }

    var origin = new THREE.Vector3(0, 0, 0);
    var direction = new THREE.Vector3(0, 1, 0);
    var raycaster = new THREE.Raycaster();
    var intersects;
    raycaster.set(origin, direction);
    //raycaster.far = far.subVectors(objDestin.position, objOrigin.position).length(); // comment this line to have an infinite ray

    matrix.makeTranslation(-offsetX, 0, -offsetZ);
    model.mesh.geometry.applyMatrix(matrix);
    intersects = raycaster.intersectObjects([model.mesh]);
    offsetY = intersects[0].point.y;
    console.log(intersects[0].point);

    for (let i = 0; i < intersects.length; i++) {
        intersects[i].object.material.color.set(Math.random() * 0xffffff);
    }
    matrix.makeTranslation(0, -offsetY, 0);
    model.mesh.geometry.applyMatrix(matrix);

    model.dimensions.offsetY = offsetY;
    model.dimensions.offsetX = offsetX;
  
    model.dimensions.offsetZ = offsetZ;
*/
    render();

}

//TODO ................................................
function saveImg() {
    // With checking if dir already exists
    var fileName = model.name.split("_"); 
    var filePath = projectionsDir + fileName[0] + '/' + model.name  + '/';
    


    if (!fs.existsSync(filePath)) {
        console.log("Path don't exist, trying to create it...");
        fs.mkdir(filePath, {
            recursive: true
        }, function (err) {
            if (err) {
                console.log(err);
            }else{
                console.log("Path: " + filePath + " created succesfuly");
            }

        });
    }

    try {
        // Get the DataUrl from the Canvas
        const urlFront = model.imgFront;
        const base64DataFront = urlFront.replace(/^data:image\/png;base64,/, "");
        fs.writeFileSync(filePath + model.name + '_front' + '.png', base64DataFront, 'base64');

        const urlTop = model.imgTop;
        const base64DataTop = urlTop.replace(/^data:image\/png;base64,/, "");
        fs.writeFileSync(filePath + model.name + '_top' + '.png', base64DataTop, 'base64'); 

        const urlLat = model.imgLat;
        const base64DataLat = urlLat.replace(/^data:image\/png;base64,/, "");
        fs.writeFileSync(filePath + model.name + '_lat' + '.png', base64DataLat, 'base64');
        alert('projeccions guardades correctament');
    } catch (e) {
        alert('Failed to save the file !');

        console.log(e)
    }

    

    saveJSON();
    //dialog.showSaveDialog(function (fileName) { });


}

function saveJSON(){
    var ametlla = {
        nom: model.name.slice(0, -4),
        altBot: model.dimensions.altura_botanica,
        alt: model.dimensions.altura,
        ample: model.dimensions.amplada,
        gruix: model.dimensions.gruixa,
        volum: model.volum,
        area: model.area,
        cm: model.centreDeMassa,
        cg: model.esfera.centre,
        ve: model.esfera.volum,
        re: model.esfera.radi,
       
        // convexHull: model.convexHull,


        //projeccions: {
        //    front: model.imgFront,
        //    sup: model.imgTop,
        //    lat: model.imgLat
        //},
        // seccions: {
        //     x: [],
        //     y: [],
        //     z: []
        // }
    }
    // for (var i = 0; i < nTalls; i++) {
    //     ametlla.seccions.x.push(model.seccions.x[i].geometry.vertices);
    //     ametlla.seccions.y.push(model.seccions.y[i].geometry.vertices);
    //     ametlla.seccions.z.push(model.seccions.z[i].geometry.vertices);
    // }
    
    // ametlla.seccions.x = JSON.stringify(ametlla.seccions.x);
    // ametlla.seccions.y = JSON.stringify(ametlla.seccions.y);
    // ametlla.seccions.z = JSON.stringify(ametlla.seccions.z);
    
    data = JSON.stringify(ametlla);
    var fileName = model.name.split("_");
    
    var filePath = projectionsDir + fileName[0] + '/' + model.name + '/';

    if (!fs.existsSync(filePath)) {
        fs.mkdir(filePath, {
            recursive: true
        }, function (err) {
            if (err) {
                console.log(err);
            }
        });
    }

    fs.writeFile(filePath + model.name + '.json', data, (err) => {
        if (err) throw err;
        console.log('Data written to file');
    });
    
    console.log('This is after the write call');
}
/* TODO.....
- altura botanica: model.dimensions.offsetY...?
- revisar tot es sistema d'archius...fet
- Guardar imatges de ses projeccions...fet
- Guardar json amb parametres de cada model...fent
- Automatitzar recorreguts per les carpetes...
- Conexio base de dades...?
*/