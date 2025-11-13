import make_ogl from "./make_ogl.js";
import { Mat4, Program, Texture } from "ogl";

export const liquidChrome = make_ogl((gl) => {
  // Create noise texture for iChannel1 (1024x1024 RGBA noise)
  const noiseData = new Uint8Array(1024 * 1024 * 4);
  for (let i = 0; i < noiseData.length; i++) {
    noiseData[i] = Math.floor(Math.random() * 256);
  }
  const noiseTexture = new Texture(gl, {
    width: 1024,
    height: 1024,
    data: noiseData,
    format: gl.RGBA,
    type: gl.UNSIGNED_BYTE,
  });

  // Load equirectangular env map for iChannel0
  const envTexture = new Texture(gl, {
    flipY: false,
    generateMipmaps: true,
    minFilter: gl.LINEAR_MIPMAP_LINEAR,
  });
  const envImg = new Image();
  envImg.src = "/tank.jpg";
  envImg.onload = () => {
    envTexture.image = envImg;
    envTexture.needsUpdate = true;
  };
  // (was: procedurally generated gradient)

  const program = new Program(gl, {
    vertex: `#version 300 es
      in vec2 position;
      in vec2 uv;
      out vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `,
    fragment: `#version 300 es
      precision highp float;
      uniform float iTime;
      uniform vec2 r;
      uniform sampler2D iChannel0;
      uniform sampler2D iChannel1;
      uniform int iFrame;
      in vec2 vUv;
      out vec4 fragColor;

      float sRGBencode(float C_linear) { return C_linear > 0.0031308 ? (1.055 * pow(C_linear, 1./2.4) - 0.055) : (12.92 * C_linear); }
      vec3 sRGBencode(vec3 C_linear) { C_linear = clamp(C_linear, 0., 1.); return vec3(sRGBencode(C_linear.x), sRGBencode(C_linear.y), sRGBencode(C_linear.z)); }

      float gyroid(vec3 p) {
        return dot(sin(p), cos(p.yzx));
      }

      float smoothUnion( float d1, float d2, float k )
      {
        float h = max(4.*k-abs(d1-d2),0.0)*.25;
        return min(d1, d2) - h*h/k;
      }

      float smoothIntersect( float d1, float d2, float k )
      {
        return -smoothUnion( -d1, -d2, k );
      }

      float expr1(vec3 p)
      {
        return gyroid(p*7.+iTime*.1)/7.-0.05-0.075 * sin(iTime*.3);
      }

      float expr2(vec3 p)
      {
        float q = 3.-cos(iTime*.05);
        return pow( dot( pow(abs(p), vec3(q)), vec3(1) ) , 1./q)-1.;
      }

      float expr3(vec3 p)
      {
        vec3 q = 3.*p;
        vec2 cell_idx = floor(q.xz);
        vec2 cell_uv = fract(q.xz) - .5;
        q.xz = cell_uv;
        float time = fract(iTime*.05 + texture(iChannel1, (mod(vec2(cell_idx)+1024., 1024.) + 0.5) / 1024.).x);
        return smoothIntersect(
          1./3.*(length(q-400.*vec3(0,1,0) * -time*pow(min(1.,time/.06)*time, 2.)  )-.25 + max(p.y+1.,0.)),
          length(p.xz) - .875+min(p.y*.1, 0.),
          .025
        );
      }

      float f(vec3 p)
      {
        float sdf = smoothIntersect(
          expr1(p), expr2(p)
          ,.02
        );
        sdf = smoothUnion(
          sdf,
          expr3(p),
          0.0805
        );
        return sdf;
      }

      float f2(vec3 p)
      {
        float sdf = smoothIntersect(
          expr1(p), expr2(p)
          ,.0208
        );
        sdf = smoothUnion(
          sdf,
          expr3(p),
          0.0808
        );
        return sdf;
      }

      vec3 calcNormal( in vec3 p )
      {
        const float eps = 1e-4;
        const vec2 h = vec2(eps,0);
        return normalize( vec3(f(p+h.xyy) - f(p-h.xyy),
                               f(p+h.yxy) - f(p-h.yxy),
                               f(p+h.yyx) - f(p-h.yyx) ) );
      }

      float calcAO( vec3 pos, vec3 nor )
      {
        float occ = 0.0;
        float sca = 1.0;
        for( float i=0.; i<5.; i++ )
        {
          float h = 0.01 + 0.12*float(i)/4.0;
          float d = f( pos + h*nor );
          occ += (h-d)*sca;
          sca *= 0.95;
          if( occ>0.35 ) break;
        }
        return clamp( 1.0 - 3.0*occ, 0.0, 1.0 ) * (0.5+0.5*nor.y);
      }

      void mainImage( in vec2 fragCoord )
      {
        vec2 uv = (2. * fragCoord - r.xy)/r.y;

        vec3 color = vec3(0);

        float focal = 2.;
        vec3 ro = vec3(0,0,3);
        vec3 rd = normalize(vec3(uv, -focal));

        float time = iTime*.2;
        float c = cos(time), s = sin(time);
        mat2 R = mat2(c,s,-s,c);

        ro.xz*=R;
        rd.xz*=R;

        float c2 = cos(c*.5), s2 = sin(c*.5);
        mat2 R2 = mat2(c2,s2,-s2,c2);
        ro.yx*=R2;
        rd.yx*=R2;

        float jitter = texture(iChannel1, (mod(vec2(fragCoord) + vec2(float(iFrame)*331., 0.), 1024.) + 0.5) / 1024.).a;
        float t = jitter;
        float transmission = 1.;
        for(float i = 0.; i < 120.; i++)
        {
          vec3 p  =  rd * t + ro;

          float sdf = f(p);

          if(abs(sdf) < 1e-4)
          {
            vec3 n = calcNormal(p);
            rd = reflect(rd, n);
            ro = p + rd*1e-3+n*1e-4;
            float extinction = .025;

            float ao = calcAO( p, n )*.25+.75;

            transmission *= exp(-t * extinction) * ao;
            t = 0.;
          }

          float sdf2 = f2(p);
          color += (.5+.5*sin(vec3(3,2,1) + i*.1 - length(p)) ) / (5e-5 + abs(sdf2));
          float stepsize = .45*abs(sdf);
          t += stepsize;

          if(length(p) > 10. || t > 100.)
          {
            break;
          }
        }
        color *= 1./120.;
        color *= 43e-5;

        vec2 uv_bg = vec2(atan(rd.z, rd.x)/(6.28318530718)+0.5, asin(clamp(rd.y,-1.,1.))/3.14159265359 + 0.5);
        color += transmission * 1.2*atanh(pow(texture(iChannel0, uv_bg).rgb, vec3(2.2))/1.005);

        color *= 1.-dot(uv, uv)*.15;
        color = tanh(color);

        color = sRGBencode(color);
        fragColor = vec4(color, 1.0);
      }

      void main() {
        vec2 fragCoord = vUv * r;
        mainImage(fragCoord);
      }
    `,
    uniforms: {
      r: { value: [gl.canvas.width, gl.canvas.height] },
      iTime: { value: 0 },
      iFrame: { value: 0 },
      iChannel0: { value: envTexture },
      iChannel1: { value: noiseTexture },
      modelViewMatrix: { value: new Mat4() },
      projectionMatrix: { value: new Mat4() },
    },
  });

  let frame = 0;
  function animate(t) {
    const nowSec = t * 0.001;
    program.uniforms.iTime.value = nowSec;
    program.uniforms.iFrame.value = frame++;
  }

  return {
    program,
    animate,
  };
});
