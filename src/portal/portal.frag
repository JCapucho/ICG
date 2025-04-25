uniform sampler2D map;
uniform vec2 u_resolution;

uniform vec3 color;

void main() {
	vec4 diffuseColor = vec4(color, 1);
	diffuseColor *= texture2D(map, gl_FragCoord.xy / u_resolution);
	gl_FragColor = diffuseColor;

	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}
