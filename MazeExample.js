var cubeVerticesBuffer;
var cubeVerticesTextureCoordBuffer;
var cubeVerticesIndexBuffer;
var cubeVerticesNormalBuffer;

var cubeRotation = 0.0;
var lastCubeUpdateTime = 0;

var gl;
var cubeTexture;

var my_maze_array = [];

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

  '  highp vec3 ambientLight = vec3(0.5, 0.2, 0.2);\n' +
  '  highp vec3 directionalLightColor = vec3(0.0, 0.0, 1.0);\n' +
  '  highp vec3 pointLightPosition = vec3(1.0, -300.0, 0.0);\n' +

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

function main() {
  var canvas = document.getElementById('webgl');
	var canvas2d = document.getElementById('2d');
	var ctx_2d = canvas2d.getContext("2d");

	my_maze = new Maze(MAZESZ);
	my_maze.randPrim(new Pos(0, 0));
	//my_maze.determ(new Pos(0, 0));
	my_maze.pos.x = 0;
	my_maze.pos.y = 0;
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
  if (gl) {
    gl.clearColor(0.0, 1.0, 1.0, 0.5);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    initBuffers();
    initTextures();

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

    pMatrix.setPerspective(100, 1, 1, 100);
    vMatrix.lookAt(15, 25, 10, 1, 0, -80, 0, 0, 1);
    mMatrix.translate(20.0, 0.0, 0.0).rotate(cubeRotation, 0, 0, 1).rotate(cubeRotation, 0, 1, 0);

    mvpMatrix.set(pMatrix).multiply(vMatrix).multiply(mMatrix);

    gl.uniformMatrix4fv(u_ModelMatrix, false, mMatrix.elements);
    gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

    vertexPositionAttribute = gl.getAttribLocation(gl.program, "a_VertexPosition");
    gl.enableVertexAttribArray(vertexPositionAttribute);

    textureCoordAttribute = gl.getAttribLocation(gl.program, "a_TextureCoord");
    gl.enableVertexAttribArray(textureCoordAttribute);

    vertexNormalAttribute = gl.getAttribLocation(gl.program, "a_VertexNormal");
    gl.enableVertexAttribArray(vertexNormalAttribute);

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVerticesBuffer);
    gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    // Set the texture coordinates attribute for the vertices.

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVerticesTextureCoordBuffer);
    gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVerticesNormalBuffer);
    gl.vertexAttribPointer(vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, cubeTexture);
    gl.uniform1i(gl.getUniformLocation(gl.program, "u_Sampler"), 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVerticesIndexBuffer);

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
          //var z = treePosition[i+2];
          mMatrix.setTranslate(x*2 , y*2, 0);
          //mMatrix.rotate(0, 35 + i, 1, 0);
          //modelMatrix.scale(1, 1, z);
          // Calculate the model view projection matrix
          mvpMatrix.set(pMatrix).multiply(vMatrix).multiply(mMatrix);
          // Pass the model view projection matrix to u_MvpMatrix
          gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
          if (my_maze_array[i][j] == false){
              gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
          }
      }
  }

  //gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
    var currentTime = (new Date).getTime();
    if (lastCubeUpdateTime) {
      var delta = currentTime - lastCubeUpdateTime;

      cubeRotation += (30 * delta) / 1000.0;
    }

    lastCubeUpdateTime = currentTime;

    requestAnimationFrame(drawScene);
  }

}

function initBuffers() {

  cubeVerticesBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVerticesBuffer);

  var vertices = new Float32Array([
    -1.0, -1.0,  1.0,  1.0, -1.0,  1.0,  1.0,  1.0,  1.0, -1.0,  1.0,  1.0,   // Front face
    -1.0, -1.0, -1.0, -1.0,  1.0, -1.0,  1.0,  1.0, -1.0,  1.0, -1.0, -1.0,   // Back face
    -1.0,  1.0, -1.0, -1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0, -1.0,   // Top face
    -1.0, -1.0, -1.0,  1.0, -1.0, -1.0,  1.0, -1.0,  1.0, -1.0, -1.0,  1.0,   // Bottom face
     1.0, -1.0, -1.0,  1.0,  1.0, -1.0,  1.0,  1.0,  1.0,  1.0, -1.0,  1.0,   // Right face
    -1.0, -1.0, -1.0, -1.0, -1.0,  1.0, -1.0,  1.0,  1.0, -1.0,  1.0, -1.0    // Left face
  ]);

  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  cubeVerticesNormalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVerticesNormalBuffer);

  var vertexNormals = new Float32Array([
     0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,   // Front face
     0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,   // Back face
     0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,   // Top face
     0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,   // Bottom face
     1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,   // Right face
    -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0   // Left face
  ]);

  gl.bufferData(gl.ARRAY_BUFFER, vertexNormals, gl.STATIC_DRAW);

  // Map the texture onto the cube's faces.

  cubeVerticesTextureCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVerticesTextureCoordBuffer);

  var textureCoordinates = new Float32Array([
    0.0,  0.0,     1.0,  0.0,     1.0,  1.0,     0.0,  1.0,  // Front
    0.0,  0.0,     1.0,  0.0,     1.0,  1.0,     0.0,  1.0,  // Back
    0.0,  0.0,     1.0,  0.0,     1.0,  1.0,     0.0,  1.0,  // Top
    0.0,  0.0,     1.0,  0.0,     1.0,  1.0,     0.0,  1.0,  // Bottom
    0.0,  0.0,     1.0,  0.0,     1.0,  1.0,     0.0,  1.0,  // Right
    0.0,  0.0,     1.0,  0.0,     1.0,  1.0,     0.0,  1.0   // Left
  ]);

  gl.bufferData(gl.ARRAY_BUFFER, textureCoordinates, gl.STATIC_DRAW);

  cubeVerticesIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVerticesIndexBuffer);

  var cubeVertexIndices =  new Uint16Array([
    0,  1,  2,      0,  2,  3,    // front
    4,  5,  6,      4,  6,  7,    // back
    8,  9,  10,     8,  10, 11,   // top
    12, 13, 14,     12, 14, 15,   // bottom
    16, 17, 18,     16, 18, 19,   // right
    20, 21, 22,     20, 22, 23    // left
  ]);

  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndices, gl.STATIC_DRAW);
}

function initTextures() {
  cubeTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, cubeTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
              new Uint8Array([0, 0, 255, 255]));
  var cubeImage = new Image();
  cubeImage.onload = function() { handleTextureLoaded(cubeImage, cubeTexture); }
  cubeImage.src = "resources/cubetexture.png";
}

function handleTextureLoaded(image, texture) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.bindTexture(gl.TEXTURE_2D, null);
}
