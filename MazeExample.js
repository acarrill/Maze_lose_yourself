
var cubeRotation = 0.0;
var lastCubeUpdateTime = 0;

var gl;


var VSHADER_SOURCE =
    'attribute highp vec3 a_VertexPosition;\n' +
    'attribute highp vec2 a_TextureCoord;\n' +
    'attribute highp vec3 a_VertexNormal;\n' +
    'uniform highp mat4 u_NormalMatrix;\n' +
    'uniform highp mat4 u_MvpMatrix;\n' +
    'uniform highp mat4 u_ModelMatrix;\n' +
    'varying highp vec2 v_TextureCoord;\n' +
    'varying highp vec3 v_Lighting;\n' +
    'void main() {\n' +
    '  gl_Position = u_MvpMatrix * vec4(a_VertexPosition, 1.0);\n' +
    '  v_TextureCoord = a_TextureCoord;\n' +

    '  highp vec3 ambientLight = vec3(0.35, 0.35, 0.35);\n' +
    '  highp vec3 directionalLightColor = vec3(0.35, 0.35, 0.35);\n' +
    '  highp vec3 pointLightPosition = vec3(-5.0, -0.0, -10.0);\n' +

    '  vec4 vertexPosition = u_ModelMatrix * vec4(a_VertexPosition, 1.0);\n' +
    '  highp vec3 lightDirection = normalize(pointLightPosition - vec3(vertexPosition));\n' +
    '  highp vec4 transformedNormal = u_NormalMatrix * vec4(a_VertexNormal, 1.0);\n' +
    '  highp float directionalW = max(dot(transformedNormal.xyz, lightDirection), 0.0);\n' +

    '  v_Lighting = ambientLight + (directionalLightColor * directionalW);\n' +
    '}\n';

// Fragment shader program
var FSHADER_SOURCE =
    'varying highp vec3 v_Lighting;\n' +
    'varying highp vec2 v_TextureCoord;\n' +
    'uniform sampler2D u_Sampler;\n' +
    'void main() {\n' +
    '  highp vec4 texelColor = texture2D(u_Sampler, vec2(v_TextureCoord.s, v_TextureCoord.t));\n' +
    '  gl_FragColor = vec4(texelColor.rgb * v_Lighting, texelColor.a);\n' +
    '}\n';

//Constructor control de camara
function ViewControl() {
      //Interfaz de parámetros y método que usaremos para crear y controlar la camara/vista
      this.yPos = 0.0;
      this.xPos = 0.0;
      this.vectorY = 0.061;
      this.vectorX = 0.998;
      this.vectorZ = 0;
      this.speed = 0.5;
      this.left = 0;
      this.right = 0;
      //parámetros en caso de control de cámara por mouse
      this.middleXPos = 500; //middle inicializado al centro del canvas
      this.middleYPos = 300;
      this.xMousePos = 0;
      this.yMousePos = 0;
      this.xOffset = 0;
      this.yOffset = 0;
      this.sensitivity = 0.000035;
      this.pitch = 0;
      this.yaw = 0;
      this.mouseCameraOn = false;
      this.move = function(speed) {
          this.speed = speed;
          this.xPos += this.speed *this.vectorX;
          this.yPos += this.speed * this.vectorY;
      }
      this.rote = function() {
          this.vectorX = Math.cos(this.pitch) * Math.cos(this.yaw);
          this.vectorY = Math.cos(this.pitch) * Math.sin(-this.yaw); //seno es impar
          this.vectorZ = Math.sin(this.pitch)
      }
}

//Constructor de sonidos
function Sound(src) {
      this.Sound = document.createElement("audio");
      this.Sound.src = src;
      this.Sound.setAttribute("preload", "auto");
      this.Sound.setAttribute("controls", "none");
      this.Sound.setAttribute("loop", "loop");
      this.Sound.style.display = "none";
      document.body.appendChild(this.Sound);
      this.play = function(){
          this.Sound.play();
      }
      this.stop = function(){
          this.Sound.pause();
      }
}

//Contructor que contiene matrices modelos y contruye los buffer de los objetos del mapa
function ModelConstructor(vertices, indexs, textureCoor, vertexNormals) {
    this.mMatrix = new Matrix4();
    this.numElements = 36;  //INICIALIZAR
    this.texture = gl.createTexture();
    this.image = new Image();
    this.image.src = "resources/textura-muro.jpg"; //INICIALIZAR
    this.vertices = vertices;
    this.VerticesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.VerticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);

    this.vertexIndices = indexs;
    this.VerticesIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.VerticesIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndices, gl.STATIC_DRAW);

    this.textureCoordinates = textureCoor;
    this.VerticesTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.VerticesTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.textureCoordinates, gl.STATIC_DRAW);

    this.vertexNormals = vertexNormals;
    this.VerticesNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.VerticesNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertexNormals, gl.STATIC_DRAW);

    this.referBuffer = function(){

        vertexPositionAttribute = gl.getAttribLocation(gl.program, "a_VertexPosition");
        gl.enableVertexAttribArray(vertexPositionAttribute);

        textureCoordAttribute = gl.getAttribLocation(gl.program, "a_TextureCoord");
        gl.enableVertexAttribArray(textureCoordAttribute);

        vertexNormalAttribute = gl.getAttribLocation(gl.program, "a_VertexNormal");
        gl.enableVertexAttribArray(vertexNormalAttribute);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.VerticesBuffer);
        gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

        // Set the texture coordinates attribute for the vertices.

        gl.bindBuffer(gl.ARRAY_BUFFER, this.VerticesTextureCoordBuffer);
        gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.VerticesNormalBuffer);
        gl.vertexAttribPointer(vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(gl.getUniformLocation(gl.program, "u_Sampler"), 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.VerticesIndexBuffer);
    }
    var that = this;
    this.initTextures = function() {
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                    new Uint8Array([0, 0, 255, 255]));
        that.image.onload = function() { handleTextureLoaded(that.image, that.texture); }
    }
}

function main() {
    var camera = new ViewControl();
    var soundtrack = new Sound("Castle_SuperMario64.mp3");

    var canvas = document.getElementById('webgl');
	var canvas2d = document.getElementById('2d');
	var ctx_2d = canvas2d.getContext("2d");

    var my_maze_array = [];
    var my_maze_size;
	var my_maze = new Maze(MAZESZ);
    my_maze.randPrim(new Pos(0, 0));
	//my_maze.determ(new Pos(0, 0));
	my_maze.pos.x = camera.xPos;
	my_maze.pos.y = camera.yPos;
	my_maze.draw(ctx_2d, 0, 0, 5, 0);
    my_maze_array = my_maze.rooms;
    my_maze_size = my_maze.sz;

    console.log(my_maze.pos);

    gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }
    //Función donde se realiza todo el control de la cámara, mouse y audio


    //Control de choques
    function validPosition(x, y) {
        //console.log(x,y)
        //console.log()
        var valid = (my_maze_array[Math.round(x)][Math.round(y)]);
        /*
        for(i = 0; i < my_maze_size; i++){
            posArray2D = (my_maze_array[i][0], my_maze_array[i][1]);
            console.log(my_maze_array[i][0]);
            if((Math.round(x) === posArray2D[0]) && (Math.round(y) === posArray2D[1])){
                var valid = false;
            }
        }
        */
        return !valid;
    }


    (function startCamera() {
        //soundtrack.play();
        camera.keyHandlerMove = function(event) {
            switch(event.key) {
                case "w":
                    console.log("actual:",camera.xPos, camera.yPos)
                    camera.speed = 0.05;
                    camera.move(camera.speed);

                    var validTotal = validPosition(camera.xPos,camera.yPos);

                    if (validX && validY) {
                        console.log("wwww")
                        camera.speed = -0.05;
                        camera.move(camera.speed);
                    }

                    break;
                case "s":
                    camera.speed = -0.05;
                    camera.move(camera.speed);
                    if (!validPosition(camera.xPos,camera.yPos)) {
                        camera.speed = 0.05;
                        camera.move(camera.speed);
                    }
                    break;
                default:
                    console.log("Key not handled");
              }
          }
          //Escuchamos en el canvas para obtener las coordenadas del raton
          canvas.addEventListener("mousemove", function(evt){
              camera.xMousePos = Math.round(evt.clientX);
              camera.yMousePos = Math.round(evt.clientY);
          }, false);
          //Control de encendido por click
          canvas.onmousedown = function(){camera.mouseCameraOn = true};
          canvas.onmouseup = function(){camera.mouseCameraOn = false};
          function mouseViewControl() {
              if (camera.mouseCameraOn){
                  camera.xOffset = camera.xMousePos - camera.middleXPos;
                  camera.yOffset = camera.middleYPos - camera.yMousePos; // al reves para coordenadas de abajo arriba
                  camera.xOffset *= camera.sensitivity;
                  camera.yOffset *= camera.sensitivity;
                  camera.pitch += camera.yOffset;
                  camera.yaw += camera.xOffset;
                  camera.rote()
              }

          }
          camera.mouseInterval = setInterval(mouseViewControl, 17);

          document.addEventListener("keydown", camera.keyHandlerMove, false);
      })()

    if (gl) {
        gl.clearColor(0.1, 0.1, 0.1, 0.6);  // Clear to black, fully opaque
        gl.clearDepth(1.0);                 // Clear everything
        gl.enable(gl.DEPTH_TEST);           // Enable depth testing
        gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

        //INICIALIZACION DE CONSTRUCTOR MODELO PARA UN CUBO
        var cubeVertices = new Float32Array([
            -1.0, -1.0,  1.0,   1.0, -1.0,  1.0,   1.0,  1.0,  1.0,  -1.0,  1.0,  1.0,   // Front face
            -1.0, -1.0, -1.0,  -1.0,  1.0, -1.0,   1.0,  1.0, -1.0,   1.0, -1.0, -1.0,   // Back face
            -1.0,  1.0, -1.0,  -1.0,  1.0,  1.0,   1.0,  1.0,  1.0,   1.0,  1.0, -1.0,   // Top face
            -1.0, -1.0, -1.0,   1.0, -1.0, -1.0,   1.0, -1.0,  1.0,  -1.0, -1.0,  1.0,   // Bottom face
             1.0, -1.0, -1.0,   1.0,  1.0, -1.0,   1.0,  1.0,  1.0,   1.0, -1.0,  1.0,   // Right face
            -1.0, -1.0, -1.0,  -1.0, -1.0,  1.0, - 1.0,  1.0,  1.0,  -1.0,  1.0, -1.0    // Left face
        ]);
        var cubeVertexIndices =  new Uint16Array([
            0,  1,  2,      0,  2,  3,    // front
            4,  5,  6,      4,  6,  7,    // back
            8,  9,  10,     8,  10, 11,   // top
            12, 13, 14,     12, 14, 15,   // bottom
            16, 17, 18,     16, 18, 19,   // right
            20, 21, 22,     20, 22, 23    // left
        ]);
        var cubeTextureCoordinates = new Float32Array([
            0.0,  0.0,     1.0,  0.0,     1.0,  1.0,     0.0,  1.0,  // Front
            0.0,  0.0,     1.0,  0.0,     1.0,  1.0,     0.0,  1.0,  // Back
            0.0,  0.0,     1.0,  0.0,     1.0,  1.0,     0.0,  1.0,  // Top
            0.0,  0.0,     1.0,  0.0,     1.0,  1.0,     0.0,  1.0,  // Bottom
            0.0,  0.0,     1.0,  0.0,     1.0,  1.0,     0.0,  1.0,  // Right
            0.0,  0.0,     1.0,  0.0,     1.0,  1.0,     0.0,  1.0   // Left
        ]);
        var cubeVertexNormals = new Float32Array([
            0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,   // Front face
            0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,   // Back face
            0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,   // Top face
            0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,   // Bottom face
            1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,   // Right face
            -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0   // Left face
        ]);
        var cube = new ModelConstructor(cubeVertices, cubeVertexIndices, cubeTextureCoordinates, cubeVertexNormals);
        cube.numElements = 36;
        cube.image.src = "resources/marmolwall.jpg";
        cube.initTextures();

        //INICIALIZACION DE CONSTRUCTOR MODELO PARA EL SUELO
        var floorVertices = new Float32Array([
            0.0, 0.0, -0.5,  0.0, my_maze_size, -0.5,  my_maze_size, 0.0, -0.5,  my_maze_size, my_maze_size, -0.5
        ]);
        var floorVertexIndices = new Uint16Array([
            1,  0,  2,      1,  2,  3    // front
        ]);
        var floorTextureCoordinates = new Float32Array([
            0.0,  0.0, my_maze_size,  0.0,     my_maze_size,  my_maze_size,     0.0,  my_maze_size  // Back
        ]);
        var floorVertexNormals = new Float32Array([
            0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0   // Back face
        ]);

        var floor = new ModelConstructor(floorVertices, floorVertexIndices, floorTextureCoordinates, floorVertexNormals);
        floor.numElements = 6;
        floor.image.src = "resources/marbletexture.png";
        floor.initTextures();

        requestAnimationFrame(drawScene, my_maze);
    }


    function drawScene() {

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
        if (!u_MvpMatrix) {
            console.log('Failed to get the storage location of u_MvpMatrix');
            return;
        }

        var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
        if (!u_ModelMatrix) {
            console.log('Failed to get the storage location of u_ModelMatrix');
            return;
        }

        var mMatrix   = new Matrix4();
        var vMatrix   = new Matrix4();
        var pMatrix   = new Matrix4();
        var mvpMatrix = new Matrix4();
        //var t = false;
        /*
        t =
         document.onkeydown = function(a){
                    console.log(a)
                    if (a.key == "t"){
                        return true;
                    }
                };
        */
        mMatrix = cube.mMatrix;
        pMatrix.setPerspective(50, 1, 0.4, 100);
        vMatrix.lookAt(camera.xPos, camera.yPos, -0.1, camera.xPos + camera.vectorX, camera.yPos + camera.vectorY, 0.002 + camera.vectorZ, 0, 0, 1);
        //vMatrix.lookAt(camera.xPos, camera.yPos, 50, camera.xPos + camera.vectorX, camera.yPos + camera.vectorY,-100, 0, 1, 0);
        //mMatrix.translate(20.0, 0.0, 0.0).rotate(cubeRotation, 0, 0, 1).rotate(cubeRotation, 0, 1, 0);
        mvpMatrix.set(pMatrix).multiply(vMatrix).multiply(mMatrix);
        cube.referBuffer();

        var normalMatrix = new Matrix4();
        normalMatrix.set(mMatrix);
        normalMatrix.invert();
        normalMatrix.transpose();
        var nUniform = gl.getUniformLocation(gl.program, "u_NormalMatrix");
        gl.uniformMatrix4fv(nUniform, false, normalMatrix.elements);

        for (var i=0; i <my_maze_size; i++){
            for (var j=0; j <my_maze_size; j++){
                var x = i;
                var y = j;

                mMatrix.setTranslate(x+0.5 , y+0.5, 0).scale(0.5,0.5,0.5)
                mvpMatrix.set(pMatrix).multiply(vMatrix).multiply(mMatrix);
                gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

                if (my_maze_array[i][j] == false){
                    gl.drawElements(gl.TRIANGLES, cube.numElements, gl.UNSIGNED_SHORT, 0);
                }
            }
        }
        floor.referBuffer();
        mMatrix = floor.mMatrix;
        mvpMatrix.set(pMatrix).multiply(vMatrix).multiply(mMatrix);
        gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
        gl.drawElements(gl.TRIANGLES, floor.numElements, gl.UNSIGNED_SHORT, 0);

        var currentTime = (new Date).getTime();
        if (lastCubeUpdateTime) {
            var delta = currentTime - lastCubeUpdateTime;

            cubeRotation += (30 * delta) / 1000.0;
        }
        lastCubeUpdateTime = currentTime;
        //Actualizamos posición en el mapa
        my_maze.pos.x = Math.floor(camera.xPos);
    	my_maze.pos.y = Math.floor(camera.yPos);
    	my_maze.draw(ctx_2d, 0, 0, 5, 0);
        requestAnimationFrame(drawScene);
    }

}

function handleTextureLoaded(image, texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);//Acercarse
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
}
