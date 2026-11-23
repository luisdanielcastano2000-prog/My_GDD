# Sincronización del diseño

Copia local **de solo lectura** del diseño de My GDD en claude.ai. No se edita aquí: si algo cambia, se cambia en claude.ai y se resincroniza.

| | Lienzo | Sistema de diseño |
|---|---|---|
| Título | My GDD · Fase 5 · Alta fidelidad + movimiento | My GDD |
| URL | https://claude.ai/artifact/6jACSpztGFHjPbmikkEFB1 | https://claude.ai/artifact/LCGT6S5t5cxHuzorURbxFB |
| Slug | `2e609985-c951-4866-bf3e-2aa82d00b614` | `9b70565c-20dd-4e04-bc79-dd145aaecee2` |
| Versión copiada | `1795028463-9d0d` | `1795002814-f788` |
| Carpeta local | `design/handoff/project/` (misma estructura que `project/`) | `design/system/` (contenido de `project/`) |
| Archivos | 147 | 35 |

- **Fecha:** 2026-11-23
- **Vía usada:** (a) lectura directa de los artifacts con la cuenta de claude.ai de la sesión (conector `claude-artifacts`: `get_artifact` → `list_files` → `read_file` con `paths`, guardado en disco). No hizo falta la vía (b).
- **Qué no se copia:** los archivos del visor y del tipo (`index.html`, `SKILL.md`, `artifact-type/**`).
- **Comprobado:** el sha256 de cada archivo coincide con el que da `list_files`. `App.dc.html` pesa 460 295 bytes. Los JSON son válidos. Hay 112 marcos `F5-*`, 30 `Mov-*` y 2 `Prototipo-HF-*`.
- **Aviso:** los marcos `*.dc.html` cargan `./support.js`, que pone el visor de claude.ai y no está en la copia. Fuera de claude.ai no se ven tal cual: sirven como referencia (escena, tema, orientación y tamaño de texto de cada marco).

## Cómo resincronizar

1. `get_artifact` de cada URL → anotar la versión. Si es la misma de arriba, no hay nada que hacer.
2. `list_files` → comparar rutas y sha256 con la lista de abajo y enseñar las diferencias (nuevos, cambiados, borrados) **antes** de sobrescribir nada.
3. Con el OK del usuario, `read_file` con `paths` (máx. 32 por llamada) y copiar a las mismas carpetas.
4. Actualizar este archivo (fecha, versión, lista).

**Nunca escribir en claude.ai** (ni publicar, ni editar, ni compartir).

## Archivos copiados (sha256, 12 primeros caracteres)

### Lienzo → `design/handoff/`

```
841ba5b1ddab    460295  project/App.dc.html
d568e0563436     51398  project/canvas.json
901bb7b12232     28751  project/ds/my-gdd/tokens.json
96b55c98ef1f      1086  project/F5-Departamento-BloqueCreado-Oscuro-V-100.dc.html
ebcf05d35dd7      1063  project/F5-Departamento-BloqueCreado-V-100.dc.html
99e9236746e3      1085  project/F5-Departamento-Menu-Oscuro-V-100.dc.html
8a3b3034ab86      1069  project/F5-Departamento-Menu-V-100.dc.html
866d154c9530      1062  project/F5-Departamento-Oscuro-V-100.dc.html
63b3e19a5416      1077  project/F5-Departamento-Renombrar-Oscuro-V-100.dc.html
38e8ed9683eb      1054  project/F5-Departamento-Renombrar-V-100.dc.html
c375200a2278      1046  project/F5-Departamento-V-100.dc.html
74836eee87dc      1071  project/F5-Departamento-Vacio-Oscuro-V-100.dc.html
23cc663670bc      1048  project/F5-Departamento-Vacio-V-100.dc.html
9fb756c8989a      1070  project/F5-Departamentos-Buscar-Oscuro-V-100.dc.html
0e3e90e410e7      1047  project/F5-Departamentos-Buscar-V-100.dc.html
e1027a042c3d      1082  project/F5-Departamentos-Creado-Oscuro-V-100.dc.html
36e5fe514bac      1059  project/F5-Departamentos-Creado-V-100.dc.html
ae809887ad16      1050  project/F5-Departamentos-Oscuro-V-100.dc.html
8e12dc91ad44      1027  project/F5-Departamentos-V-100.dc.html
be2fea884b37      1066  project/F5-Departamentos-Vacio-Oscuro-V-100.dc.html
658ec45467ea      1043  project/F5-Departamentos-Vacio-V-100.dc.html
964b890fe161      1075  project/F5-Desactualizados-Oscuro-V-100.dc.html
990930323521      1052  project/F5-Desactualizados-V-100.dc.html
d62844b7b8c3      1078  project/F5-Editor-ErrorGuardar-Oscuro-V-100.dc.html
59dce2acecb2      1062  project/F5-Editor-ErrorGuardar-V-100.dc.html
240916b45626      1066  project/F5-Editor-Gameplay-Oscuro-V-100.dc.html
03394115deb3      1043  project/F5-Editor-Gameplay-V-100.dc.html
a858b257250f      1071  project/F5-Editor-Guardado-Oscuro-V-100.dc.html
b7e071170e09      1055  project/F5-Editor-Guardado-V-100.dc.html
5f87c7c5d393      1068  project/F5-Editor-Oscuro-V-100.dc.html
ca21298c7a5c      1083  project/F5-Editor-Revisado-Oscuro-V-100.dc.html
cfacfb8d5bcb      1060  project/F5-Editor-Revisado-V-100.dc.html
2fe07fcdc9d3      1052  project/F5-Editor-V-100.dc.html
73264f78e400      1081  project/F5-Editor-Vacio-Oscuro-V-100.dc.html
a439e8cfaa18      1058  project/F5-Editor-Vacio-V-100.dc.html
bf2c6c67d51f      1073  project/F5-Equipo-Gestionar-Oscuro-V-100.dc.html
868ffa6e91c7      1050  project/F5-Equipo-Gestionar-V-100.dc.html
f0a17b1c1b0a      1063  project/F5-Equipo-Invitar-Oscuro-V-100.dc.html
c638c9427dff      1040  project/F5-Equipo-Invitar-V-100.dc.html
9333a93990ab      1079  project/F5-Equipo-InvitarError-Oscuro-V-100.dc.html
c7744e528e66      1056  project/F5-Equipo-InvitarError-V-100.dc.html
83661fdc4535      1045  project/F5-Equipo-Oscuro-V-100.dc.html
fa60c9205246      1070  project/F5-Equipo-Quitar-Oscuro-V-100.dc.html
7c6f5b068475      1047  project/F5-Equipo-Quitar-V-100.dc.html
f214c41b3ea2      1022  project/F5-Equipo-V-100.dc.html
9977286de65e      1063  project/F5-Feedback-Oscuro-V-100.dc.html
fa270abff7f3      1040  project/F5-Feedback-V-100.dc.html
9359607ba554      1077  project/F5-Forgot-Enviado-Oscuro-V-100.dc.html
5e2b813b105e      1054  project/F5-Forgot-Enviado-V-100.dc.html
e158de4232a5      1054  project/F5-Forgot-Oscuro-V-100.dc.html
d545034f8b6d      1031  project/F5-Forgot-V-100.dc.html
302298214197      1058  project/F5-Glosario-Oscuro-V-100.dc.html
72e00d46800e      1035  project/F5-Glosario-V-100.dc.html
458df73780ec      1065  project/F5-Guia-Oscuro-V-100.dc.html
b82115a41a3d      1042  project/F5-Guia-V-100.dc.html
f66f3f4b0e4c      1042  project/F5-Help-Oscuro-V-100.dc.html
feeea0083bd7      1019  project/F5-Help-V-100.dc.html
9e0189c3fc0e      1068  project/F5-Home-Borrar-Oscuro-V-100.dc.html
082479bda131      1045  project/F5-Home-Borrar-V-100.dc.html
afcac3f18006      1066  project/F5-Home-Error-Oscuro-V-100.dc.html
ac73555cf8b5      1043  project/F5-Home-Error-V-100.dc.html
c5dfd1893b3f      1073  project/F5-Home-Menu-Oscuro-V-100.dc.html
69cd4eef763d      1057  project/F5-Home-Menu-V-100.dc.html
d06f7c31e9b3      1042  project/F5-Home-Oscuro-V-100.dc.html
1fbe3b321f05      1071  project/F5-Home-Renombrar-Oscuro-V-100.dc.html
f64d85c49ed2      1048  project/F5-Home-Renombrar-V-100.dc.html
3cca3004e28e      1026  project/F5-Home-V-100.dc.html
c5db09b8a2e1      1050  project/F5-Idioma-Oscuro-V-100.dc.html
dc8e477bc3eb      1027  project/F5-Idioma-V-100.dc.html
8b577f38b418      1069  project/F5-Login-Error-Oscuro-V-100.dc.html
79cda6b6ec07      1053  project/F5-Login-Error-V-100.dc.html
824d5ddb21e4      1045  project/F5-Login-Oscuro-V-100.dc.html
bbaf008ee2d2      1029  project/F5-Login-V-100.dc.html
baae2d4523ec      1079  project/F5-NewNote-ErrorEnvio-Oscuro-V-100.dc.html
03dad8773f51      1056  project/F5-NewNote-ErrorEnvio-V-100.dc.html
4587ffc22a67      1049  project/F5-NewNote-Oscuro-V-100.dc.html
3e11521cd480      1033  project/F5-NewNote-V-100.dc.html
ae07da2dadad      1070  project/F5-NewNote-Vacio-Oscuro-V-100.dc.html
7f30fe40a375      1047  project/F5-NewNote-Vacio-V-100.dc.html
729d729d2b74      1067  project/F5-Notes-Enviada-Oscuro-V-100.dc.html
dac9dec50f76      1044  project/F5-Notes-Enviada-V-100.dc.html
7b8ad6a7cfb5      1051  project/F5-Notes-Enviadas-Oscuro-V-100.dc.html
c54f3d498268      1035  project/F5-Notes-Enviadas-V-100.dc.html
b589387f70c3      1064  project/F5-Notes-EnviadasVacio-Oscuro-V-100.dc.html
9da66bb4216c      1041  project/F5-Notes-EnviadasVacio-V-100.dc.html
2eec25187e96      1073  project/F5-Notes-Menu-Oscuro-V-100.dc.html
640aa3b5451f      1050  project/F5-Notes-Menu-V-100.dc.html
95b9d605f5df      1089  project/F5-Notes-Plegado-Oscuro-V-100.dc.html
551a30e16893      1073  project/F5-Notes-Plegado-V-100.dc.html
524594269192      1056  project/F5-Notes-Recibidas-Oscuro-V-100.dc.html
dcbd2032949c      1040  project/F5-Notes-Recibidas-V-100.dc.html
38e9db64e041      1059  project/F5-NuevoGDD-Oscuro-V-100.dc.html
ccb5a28b7e36      1036  project/F5-NuevoGDD-V-100.dc.html
e7890131da58      1055  project/F5-Perfil-Datos-Oscuro-V-100.dc.html
4988877c451c      1032  project/F5-Perfil-Datos-V-100.dc.html
1af2165cea3a      1058  project/F5-Perfil-Editar-Oscuro-V-100.dc.html
a897cf63de48      1035  project/F5-Perfil-Editar-V-100.dc.html
6643cf663409      1072  project/F5-Perfil-Foto-Oscuro-V-100.dc.html
43505972ddd1      1049  project/F5-Perfil-Foto-V-100.dc.html
13da5bb30bd8      1048  project/F5-Perfil-Oscuro-V-100.dc.html
20427befb210      1050  project/F5-Perfil-Password-Oscuro-V-100.dc.html
cc90896fb713      1027  project/F5-Perfil-Password-V-100.dc.html
54c09297e2f5      1032  project/F5-Perfil-V-100.dc.html
6422de07740a      1058  project/F5-Privacidad-Oscuro-V-100.dc.html
cc3c973dc58e      1035  project/F5-Privacidad-V-100.dc.html
6e0730b3e293      1067  project/F5-Review-Completo-Oscuro-V-100.dc.html
d35e13f56756      1044  project/F5-Review-Completo-V-100.dc.html
c036cf26ac96      1066  project/F5-Review-Oscuro-V-100.dc.html
0f9ee499a3ff      1076  project/F5-Review-Revisado-Oscuro-V-100.dc.html
22c337b0a2f0      1053  project/F5-Review-Revisado-V-100.dc.html
767ce4138d99      1043  project/F5-Review-V-100.dc.html
b07bcfc3fdda      1076  project/F5-Signup-Error-Oscuro-V-100.dc.html
accfcd9fb354      1053  project/F5-Signup-Error-V-100.dc.html
f3fa82102157      1047  project/F5-Signup-Oscuro-V-100.dc.html
e6763ffbeb61      1024  project/F5-Signup-V-100.dc.html
e28c3e594db6      1085  project/Mov-Departamento-Claro.dc.html
0ebfc949668b      1061  project/Mov-Departamento-Lento.dc.html
b67b0e4b8d51      1099  project/Mov-Departamento-Oscuro.dc.html
192194a19442      1060  project/Mov-Departamento-Reducido.dc.html
511337c2e6ab      1128  project/Mov-Departamentos-Claro.dc.html
dfdb9d93ec91      1058  project/Mov-Departamentos-Lento.dc.html
396f19d9dfd3      1142  project/Mov-Departamentos-Oscuro.dc.html
ad4b018574bf      1057  project/Mov-Departamentos-Reducido.dc.html
73133ae810a3      1064  project/Mov-Editor-Claro.dc.html
70260c61daf1      1078  project/Mov-Editor-Oscuro.dc.html
f6b8937d8796      1090  project/Mov-Equipo-Claro.dc.html
ca9d4ddd392a      1104  project/Mov-Equipo-Oscuro.dc.html
58382c71d90a      1053  project/Mov-Feedback-Claro.dc.html
ca79057e5037      1067  project/Mov-Feedback-Oscuro.dc.html
389a188dcd8b      1076  project/Mov-Home-Claro.dc.html
84a98843147f      1090  project/Mov-Home-Oscuro.dc.html
396f6aaf2be7      1074  project/Mov-Login-Claro.dc.html
9090d9dfc1e8      1088  project/Mov-Login-Oscuro.dc.html
5a7e8cb721e8      1062  project/Mov-NewNote-Claro.dc.html
a66767c6e4a6      1076  project/Mov-NewNote-Oscuro.dc.html
1077c4a952da      1089  project/Mov-Notes-Claro.dc.html
51c8afff68a8      1103  project/Mov-Notes-Oscuro.dc.html
aa625ad39972      1070  project/Mov-Perfil-Claro.dc.html
0605ad5988f4      1084  project/Mov-Perfil-Oscuro.dc.html
885a614f95d4      1076  project/Mov-Prototipo-Claro.dc.html
b346e6a85413      1022  project/Mov-Prototipo-Lento.dc.html
744a33518fd0      1090  project/Mov-Prototipo-Oscuro.dc.html
2fcbfc6369d8      1026  project/Mov-Prototipo-Reducido.dc.html
efa1c182fae4      1048  project/Mov-Reset-Claro.dc.html
fa56fc828c0f      1062  project/Mov-Reset-Oscuro.dc.html
fd02f347cad4      1042  project/Prototipo-HF-Claro.dc.html
4db7d8225bcd      1056  project/Prototipo-HF-Oscuro.dc.html
```

### Sistema de diseño → `design/system/`

```
9d73d9011676       722  assets/Logos/README.md
4feb887683cd      3419  components/BottomSheet/preview.html
2dad88548905       540  components/BottomSheet/README.md
952b82d54f7b      4638  components/Button/preview.html
eb1e8abcd74f      1254  components/Button/README.md
a14eb2a7c6a4      2787  components/ButtonGroup/preview.html
8be449f02c0d       462  components/ButtonGroup/README.md
579b8be8d0db      9165  components/Card/preview.html
62571547defa      3148  components/Card/README.md
6eda42ce1642      5117  components/Chip/preview.html
35b2da1bcb9e       589  components/Chip/README.md
0f5c69ceb45a      7272  components/Cover/preview.html
215777979cf5      4143  components/Dialog/preview.html
ebe61105c84f       461  components/Dialog/README.md
2a95248ee40d      3451  components/FAB/preview.html
cc13f12597f2       539  components/FAB/README.md
b2d0e3263345      2939  components/FloatingToolbar/preview.html
84837e954331       363  components/FloatingToolbar/README.md
60dc117109a3      3775  components/IconButton/preview.html
a21c6912491d       447  components/IconButton/README.md
bfdf9a7e03e8      3251  components/ListItem/preview.html
1d33cb803885       514  components/ListItem/README.md
fdc82f7d0030      3128  components/NavigationBar/preview.html
4ff10f7267b7       605  components/NavigationBar/README.md
ac3eea0c9e07      3632  components/Snackbar/preview.html
5a2e7f3da2ac      1146  components/Snackbar/README.md
6a12e1070338      4011  components/Switch/preview.html
b2abc27ee928       529  components/Switch/README.md
6ae023a74537      3845  components/TextField/preview.html
eacdc8c28bee       444  components/TextField/README.md
cbbc0b84316c      2803  components/TopAppBar/preview.html
928e4a3a3eed       301  components/TopAppBar/README.md
709ae5c387f8      4586  design-system.json
549347e70e4d     14391  README.md
901bb7b12232     28751  tokens.json
```
