"use client"
import { useAnimation } from "framer-motion";
import { useRouter } from 'next/navigation';
import React, { useState, useMemo, useRef, useEffect } from "react";
import axios from 'axios';
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Canvas, useFrame, useThree } from "@react-three/fiber";

import * as THREE from "three";

export const CanvasRevealEffect = ({
    animationSpeed = 10,
    opacities = [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1],
    colors = [[0, 255, 255]],
    containerClassName,
    dotSize,
    showGradient = true,

    // This controls the direction
    reverse = false
}) => {
    return (
        <div className={cn("h-full relative w-full", containerClassName)}> {/* Removed bg-white */}
            <div className="h-full w-full">
                <DotMatrix
                    colors={colors ?? [[0, 255, 255]]}
                    dotSize={dotSize ?? 3}
                    opacities={
                        opacities ?? [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1]
                    }
                    // Pass reverse state and speed via string flags in the empty shader prop
                    shader={`
            ${reverse ? 'u_reverse_active' : 'false'}_;
            animation_speed_factor_${animationSpeed.toFixed(1)}_;
          `}
                    center={["x", "y"]} />
            </div>
            {showGradient && (
                // Adjust gradient colors if needed based on background (was bg-white, now likely uses containerClassName bg)
                // Example assuming a dark background like the SignInPage uses:
                (<div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />)
            )}
        </div>
    );
};


const DotMatrix = ({
    colors = [[0, 0, 0]],
    opacities = [0.04, 0.04, 0.04, 0.04, 0.04, 0.08, 0.08, 0.08, 0.08, 0.14],
    totalSize = 20,
    dotSize = 2,
    shader = "", // This shader string will now contain the animation logic
    center = ["x", "y"],
}) => {
    // ... uniforms calculation remains the same for colors, opacities, etc.
    const uniforms = React.useMemo(() => {
        let colorsArray = [
            colors[0],
            colors[0],
            colors[0],
            colors[0],
            colors[0],
            colors[0],
        ];
        if (colors.length === 2) {
            colorsArray = [
                colors[0],
                colors[0],
                colors[0],
                colors[1],
                colors[1],
                colors[1],
            ];
        } else if (colors.length === 3) {
            colorsArray = [
                colors[0],
                colors[0],
                colors[1],
                colors[1],
                colors[2],
                colors[2],
            ];
        }
        return {
            u_colors: {
                value: colorsArray.map((color) => [
                    color[0] / 255,
                    color[1] / 255,
                    color[2] / 255,
                ]),
                type: "uniform3fv",
            },
            u_opacities: {
                value: opacities,
                type: "uniform1fv",
            },
            u_total_size: {
                value: totalSize,
                type: "uniform1f",
            },
            u_dot_size: {
                value: dotSize,
                type: "uniform1f",
            },
            u_reverse: {
                value: shader.includes("u_reverse_active") ? 1 : 0, // Convert boolean to number (1 or 0)
                type: "uniform1i", // Use 1i for bool in WebGL1/GLSL100, or just bool for GLSL300+ if supported
            },
        };
    }, [colors, opacities, totalSize, dotSize, shader]); // Add shader to dependencies

    return (
        <Shader
            // The main animation logic is now built *outside* the shader prop
            source={`
        precision mediump float;
        in vec2 fragCoord;

        uniform float u_time;
        uniform float u_opacities[10];
        uniform vec3 u_colors[6];
        uniform float u_total_size;
        uniform float u_dot_size;
        uniform vec2 u_resolution;
        uniform int u_reverse; // Changed from bool to int

        out vec4 fragColor;

        float PHI = 1.61803398874989484820459;
        float random(vec2 xy) {
            return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x);
        }
        float map(float value, float min1, float max1, float min2, float max2) {
            return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
        }

        void main() {
            vec2 st = fragCoord.xy;
            ${center.includes("x")
                    ? "st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));"
                    : ""
                }
            ${center.includes("y")
                    ? "st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));"
                    : ""
                }

            float opacity = step(0.0, st.x);
            opacity *= step(0.0, st.y);

            vec2 st2 = vec2(int(st.x / u_total_size), int(st.y / u_total_size));

            float frequency = 5.0;
            float show_offset = random(st2); // Used for initial opacity random pick and color
            float rand = random(st2 * floor((u_time / frequency) + show_offset + frequency));
            opacity *= u_opacities[int(rand * 10.0)];
            opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));
            opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));

            vec3 color = u_colors[int(show_offset * 6.0)];

            // --- Animation Timing Logic ---
            float animation_speed_factor = 0.5; // Extract speed from shader string
            vec2 center_grid = u_resolution / 2.0 / u_total_size;
            float dist_from_center = distance(center_grid, st2);

            // Calculate timing offset for Intro (from center)
            float timing_offset_intro = dist_from_center * 0.01 + (random(st2) * 0.15);

            // Calculate timing offset for Outro (from edges)
            // Max distance from center to a corner of the grid
            float max_grid_dist = distance(center_grid, vec2(0.0, 0.0));
            float timing_offset_outro = (max_grid_dist - dist_from_center) * 0.02 + (random(st2 + 42.0) * 0.2);


            float current_timing_offset;
            if (u_reverse == 1) {
                current_timing_offset = timing_offset_outro;
                 // Outro logic: opacity starts high, goes to 0 when time passes offset
                 opacity *= 1.0 - step(current_timing_offset, u_time * animation_speed_factor);
                 // Clamp for fade-out transition
                 opacity *= clamp((step(current_timing_offset + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);
            } else {
                current_timing_offset = timing_offset_intro;
                 // Intro logic: opacity starts 0, goes to base opacity when time passes offset
                 opacity *= step(current_timing_offset, u_time * animation_speed_factor);
                 // Clamp for fade-in transition
                 opacity *= clamp((1.0 - step(current_timing_offset + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);
            }


            fragColor = vec4(color, opacity);
            fragColor.rgb *= fragColor.a; // Premultiply alpha
        }`}
            uniforms={uniforms}
            maxFps={60} />
    );
};


const ShaderMaterial = ({
    source,
    uniforms,
    maxFps = 60
}) => {
    const { size } = useThree();
    const ref = useRef(null);
    let lastFrameTime = 0;

    useFrame(({ clock }) => {
        if (!ref.current) return;
        const timestamp = clock.getElapsedTime();

        lastFrameTime = timestamp;

        const material = ref.current.material;
        const timeLocation = material.uniforms.u_time;
        timeLocation.value = timestamp;
    });

    const getUniforms = () => {
        const preparedUniforms = {};

        for (const uniformName in uniforms) {
            const uniform = uniforms[uniformName];

            switch (uniform.type) {
                case "uniform1f":
                    preparedUniforms[uniformName] = { value: uniform.value, type: "1f" };
                    break;
                case "uniform1i":
                    preparedUniforms[uniformName] = { value: uniform.value, type: "1i" };
                    break;
                case "uniform3f":
                    preparedUniforms[uniformName] = {
                        value: new THREE.Vector3().fromArray(uniform.value),
                        type: "3f",
                    };
                    break;
                case "uniform1fv":
                    preparedUniforms[uniformName] = { value: uniform.value, type: "1fv" };
                    break;
                case "uniform3fv":
                    preparedUniforms[uniformName] = {
                        value: uniform.value.map((v) =>
                            new THREE.Vector3().fromArray(v)),
                        type: "3fv",
                    };
                    break;
                case "uniform2f":
                    preparedUniforms[uniformName] = {
                        value: new THREE.Vector2().fromArray(uniform.value),
                        type: "2f",
                    };
                    break;
                default:
                    console.error(`Invalid uniform type for '${uniformName}'.`);
                    break;
            }
        }

        preparedUniforms["u_time"] = { value: 0, type: "1f" };
        preparedUniforms["u_resolution"] = {
            value: new THREE.Vector2(size.width * 2, size.height * 2),
        }; // Initialize u_resolution
        return preparedUniforms;
    };

    // Shader material
    const material = useMemo(() => {
        const materialObject = new THREE.ShaderMaterial({
            vertexShader: `
      precision mediump float;
      in vec2 coordinates;
      uniform vec2 u_resolution;
      out vec2 fragCoord;
      void main(){
        float x = position.x;
        float y = position.y;
        gl_Position = vec4(x, y, 0.0, 1.0);
        fragCoord = (position.xy + vec2(1.0)) * 0.5 * u_resolution;
        fragCoord.y = u_resolution.y - fragCoord.y;
      }
      `,
            fragmentShader: source,
            uniforms: getUniforms(),
            glslVersion: THREE.GLSL3,
            blending: THREE.CustomBlending,
            blendSrc: THREE.SrcAlphaFactor,
            blendDst: THREE.OneFactor,
        });

        return materialObject;
    }, [size.width, size.height, source]);

    return (
        <mesh ref={ref}>
            <planeGeometry args={[2, 2]} />
            <primitive object={material} attach="material" />
        </mesh>
    );
};

const Shader = ({ source, uniforms, maxFps = 60 }) => {
    return (
        <Canvas className="absolute inset-0  h-full w-full">
            <ShaderMaterial source={source} uniforms={uniforms} maxFps={maxFps} />
        </Canvas>
    );
};

const AnimatedNavLink = ({
    href,
    children
}) => {
    const defaultTextColor = 'text-gray-300';
    const hoverTextColor = 'text-white';
    const textSizeClass = 'text-sm';

    return (
        <a
            href={href}
            className={`group relative inline-block overflow-hidden h-5 flex items-center ${textSizeClass}`}>
            <div
                className="flex flex-col transition-transform duration-400 ease-out transform group-hover:-translate-y-1/2">
                <span className={defaultTextColor}>{children}</span>
                <span className={hoverTextColor}>{children}</span>
            </div>
        </a>
    );
};

function MiniNavbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [headerShapeClass, setHeaderShapeClass] = useState('rounded-full');
    const shapeTimeoutRef = useRef(null);

    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    useEffect(() => {
        if (shapeTimeoutRef.current) {
            clearTimeout(shapeTimeoutRef.current);
        }

        if (isOpen) {
            setHeaderShapeClass('rounded-xl');
        } else {
            shapeTimeoutRef.current = setTimeout(() => {
                setHeaderShapeClass('rounded-full');
            }, 300);
        }

        return () => {
            if (shapeTimeoutRef.current) {
                clearTimeout(shapeTimeoutRef.current);
            }
        };
    }, [isOpen]);

    const logoElement = (
        <div className="relative w-5 h-5 flex items-center justify-center">
            <span
                className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 top-0 left-1/2 transform -translate-x-1/2 opacity-80"></span>
            <span
                className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 left-0 top-1/2 transform -translate-y-1/2 opacity-80"></span>
            <span
                className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 right-0 top-1/2 transform -translate-y-1/2 opacity-80"></span>
            <span
                className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 bottom-0 left-1/2 transform -translate-x-1/2 opacity-80"></span>
        </div>
    );

    const navLinksData = [
        { label: 'Manifesto', href: '#1' },
        { label: 'Careers', href: '#2' },
        { label: 'Discover', href: '#3' },
    ];

    const loginButtonElement = (
        <a
        href="http://localhost:3000/login"
            className="px-4 py-2 sm:px-3 text-xs sm:text-sm border border-[#333] bg-[rgba(31,31,31,0.62)] text-gray-300 rounded-full hover:border-white/50 hover:text-white transition-colors duration-200 w-full sm:w-auto">
            LogIn
        </a>
    );

    const signupButtonElement = (
        <div className="relative group w-full sm:w-auto">
            <div
                className="absolute inset-0 -m-2 rounded-full
                       hidden sm:block
                       bg-gray-100
                       opacity-40 filter blur-lg pointer-events-none
                       transition-all duration-300 ease-out
                       group-hover:opacity-60 group-hover:blur-xl group-hover:-m-3"></div>
            <a
                href="http://localhost:3000/login"
                className="relative z-10 px-4 py-2 sm:px-3 text-xs sm:text-sm font-semibold text-black bg-gradient-to-br from-gray-100 to-gray-300 rounded-full hover:from-gray-200 hover:to-gray-400 transition-all duration-200 w-full sm:w-auto">
                Signup
            </a>
        </div>
    );

    return (
        <header
            className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-20
                         flex flex-col items-center
                         pl-6 pr-6 py-3 backdrop-blur-sm
                         ${headerShapeClass}
                         border border-[#333] bg-[#1f1f1f57]
                         w-[calc(100%-2rem)] sm:w-auto
                         transition-[border-radius] duration-0 ease-in-out`}>
            <div className="flex items-center justify-between w-full gap-x-6 sm:gap-x-8">
                <div className="flex items-center">
                    {logoElement}
                </div>

                <nav className="hidden sm:flex items-center space-x-4 sm:space-x-6 text-sm">
                    {navLinksData.map((link) => (
                        <AnimatedNavLink key={link.href} href={link.href}>
                            {link.label}
                        </AnimatedNavLink>
                    ))}
                </nav>

                <div className="hidden sm:flex items-center gap-2 sm:gap-3">
                    {loginButtonElement}
                    {signupButtonElement}
                </div>

                <button
                    className="sm:hidden flex items-center justify-center w-8 h-8 text-gray-300 focus:outline-none"
                    onClick={toggleMenu}
                    aria-label={isOpen ? 'Close Menu' : 'Open Menu'}>
                    {isOpen ? (
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"><path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M6 18L18 6M6 6l12 12"></path></svg>
                    ) : (
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"><path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    )}
                </button>
            </div>
            <div
                className={`sm:hidden flex flex-col items-center w-full transition-all ease-in-out duration-300 overflow-hidden
                         ${isOpen ? 'max-h-[1000px] opacity-100 pt-4' : 'max-h-0 opacity-0 pt-0 pointer-events-none'}`}>
                <nav className="flex flex-col items-center space-y-4 text-base w-full">
                    {navLinksData.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="text-gray-300 hover:text-white transition-colors w-full text-center">
                            {link.label}
                        </a>
                    ))}
                </nav>
                <div className="flex flex-col items-center space-y-4 mt-4 w-full">
                    {loginButtonElement}
                    {signupButtonElement}
                </div>
            </div>
        </header>
    );
}

export const SignInPage = ({
    className
}) => {
    const [initialCanvasVisible, setInitialCanvasVisible] = useState(true);
    const [reverseCanvasVisible, setReverseCanvasVisible] = useState(false);

    const [form, setform] = useState({
        email: "",
        username: "",
        password: "",
        name: "",
    });

    const router = useRouter();

    const controls = useAnimation();

    const handleChange = (e) => {
        const { name, value } = e.target;

        setform(prev => ({
            ...prev,
            [name]: value
        }));
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await axios.post(
                "/express/signup",
                form,
                { withCredentials: true }
            );
            console.log(response);

            if (response.data) {
                await controls.start({
                    x: [0, -10, 10, -10, 10, 0],
                    transition: { duration: 0.5 }
                });

                router.push('/dashboard');
            }
            else {
                console.error("Signup failed");
            }

        } catch (e) {
            console.log(e.message);
        }
    };

    return (
        <div
            className={cn("flex w-[100%] flex-col min-h-screen bg-black relative", className)}>
            <div className="absolute inset-0 z-0">
                {/* Initial canvas (forward animation) */}
                {initialCanvasVisible && (
                    <div className="absolute inset-0">
                        <CanvasRevealEffect
                            animationSpeed={3}
                            containerClassName="bg-black"
                            colors={[
                                [255, 255, 255],
                                [255, 255, 255],
                            ]}
                            dotSize={6}
                            reverse={false} />
                    </div>
                )}

                {/* Reverse canvas (appears when code is complete) */}
                {reverseCanvasVisible && (
                    <div className="absolute inset-0">
                        <CanvasRevealEffect
                            animationSpeed={4}
                            containerClassName="bg-black"
                            colors={[
                                [255, 255, 255],
                                [255, 255, 255],
                            ]}
                            dotSize={6}
                            reverse={true} />
                    </div>
                )}

                <div
                    className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,1)_0%,_transparent_100%)]" />
                <div
                    className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-black to-transparent" />
            </div>
            {/* Content Layer */}
            <div className="relative z-10 flex flex-col flex-1 justify-center items-center">
                {/* Top navigation */}
                <MiniNavbar />

                {/* Main content container */}
                <motion.div
                    initial={{ opacity: 0.5, y: 100 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{
                        delay: 0.3,
                        duration: 0.8,
                        ease: "easeInOut",
                    }}
                    className="border-nonemotion. border-dashed border-white h-full w-1/2 pt-10 flex justify-center items-center">
                    <div className=" h-200 w-200 ">
                        {/* Sign Up Account Div */}
                        <div className=" text-center flex flex-wrap gap-2">
                            <div className="text-[#FAFAFA] w-full font-bold text-3xl">Sign Up Account</div>
                            <div className="text-[#BCBCBC] text-md w-full ">Enter your personal data to create your account</div>
                        </div>

                        {/* OAuth Buttons */}
                        <div className="w-full  justify-center items-center py-2 px-4 flex gap-14 pt-8">

                            <motion.a
                                href="/express/auth/google"
                                whileHover={{ scale: 1.05 }}
                                transition={{
                                    delay: 0.1,
                                    duration: 0.2,
                                    ease: "easeInOut",
                                }}
                                whileTap={{ scale: 1 }}
                                className="w-1/4 h-15 text-[#FDFDFD] rounded-xl border-2 border-[#1E1F1F] flex gap-2 justify-center items-center cursor-pointer  transition-colors">
                                {/* Add dimensions to this div or the SVG directly */}
                                <div className="flex items-center justify-center">
                                    <svg
                                        className="h-6 w-6" // This makes it visible!
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                </div>
                                <div className="font-medium">Google</div>
                            </motion.a>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                transition={{
                                    delay: 0.1,
                                    duration: 0.2,
                                    ease: "easeInOut",
                                }}
                                whileTap={{ scale: 1 }}
                                className="w-1/4 h-15 text-[#FDFDFD] rounded-xl border-2 border-[#1E1F1F] flex gap-2 justify-center items-center cursor-pointer transition-colors">
                                <div className="flex items-center justify-center">
                                    <svg
                                        className="h-6 w-6" // This handles the scaling perfectly
                                        viewBox="0 0 16 16"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
                                            fill="currentColor" // This makes it match your text color!
                                        />
                                    </svg>
                                </div>
                                <div className="font-medium">GitHub</div>
                            </motion.button>
                        </div>

                        {/* Or Line */}
                        <div className="flex items-center justify-center gap-4 w-full h-10">
                            <div className="h-[1px] w-1/4 bg-[#313131]"></div>
                            <span className="text-[#888888] text-sm">or</span>
                            <div className="h-[1px] w-1/4 bg-[#313131]"></div>
                        </div>
                        <form action="" onSubmit={handleSubmit}>
                            {/* Input Form */}

                            <motion.div animate={controls} className="text-white w-full">

                                <div className="flex flex-wrap justify-center gap-2 p-5  ">
                                    <div className=" flex flex-col">
                                        <label className="text-[#DFDFDF] font-bold mb-4">
                                            Name
                                        </label>
                                        <div className="pr-2">
                                            <input className="bg-[#313131] p-3  rounded-xl " placeholder="eg. Ram"
                                                type="text"
                                                name="name"
                                                value={form.name}
                                                onChange={handleChange} /></div>
                                    </div>
                                    <div className=" flex flex-col">
                                        <label className="text-[#DFDFDF] pl-2 font-bold mb-4">
                                            Username
                                        </label>
                                        <div className="pl-2">
                                            <input className="bg-[#313131] p-3 rounded-xl " placeholder="eg. Ram_512GB"
                                                type="text"
                                                name="username"
                                                value={form.username}
                                                onChange={handleChange} /></div>
                                    </div>
                                </div>

                                <div className=" flex w-full px-35 py-5">
                                    <div className="flex flex-col flex-1 px-8">
                                        <label className="text-[#DFDFDF] font-bold mb-4">Email</label>
                                        <input
                                            className="bg-[#313131] p-3 w-full rounded-xl text-white"
                                            type="email"
                                            name="email"
                                            value={form.email}
                                            onChange={handleChange}
                                            placeholder="eg. ram@gmail.com"
                                        />
                                    </div>
                                </div>

                                <div className=" flex w-full px-35 py-5">
                                    <div className="flex flex-col flex-1 px-8">
                                        <label className="text-[#DFDFDF] font-bold mb-2">Password</label>
                                        <input
                                            className="bg-[#313131] p-3 w-full rounded-xl text-white"
                                            type="password"
                                            name="password"
                                            value={form.password}
                                            onChange={handleChange}
                                            placeholder="Enter your password"
                                        />
                                    </div>
                                </div>

                                <div className="text-[#DFDFDF] px-43 pt-2">
                                    <div>Must be at least 8 characters long</div>
                                </div>
                            </motion.div>

                            <div className="w-full mt-2 px-42 py-5 ">
                                <motion.button
                                    animate={controls}
                                    whileHover={{ scale: 1.01 }}
                                    transition={{
                                        delay: 0.1,
                                        duration: 0.2,
                                        ease: "easeInOut"
                                    }}
                                    type="submit"
                                    whileTap={{ scale: 1 }}
                                    className="border-2 rounded-xl font-bold  text-[#565656] bg-[#FFFFFF] p-3 w-full border-white hover:text-[#000000] cursor-pointer">
                                    Sign Up
                                </motion.button>
                            </div>
                        </form>

                        <div className="text-center p-3">
                            <div className="text-center p-3">
                                <div className="text-[#6E6E70]">
                                    Already have an account? {" "}
                                    <motion.a
                                        href="http://localhost:3000/login"
                                        className="relative text-[#E4E4E4] cursor-pointer inline-block"
                                        whileHover="hover"
                                    >
                                        Log in
                                        <motion.div
                                            className="absolute bottom-0 left-0 h-[1px] bg-[#E4E4E4]"
                                            initial={{ width: 0 }}
                                            variants={{
                                                hover: { width: "100%" }
                                            }}
                                            transition={{ duration: 0.5, ease: "easeInOut" }}
                                        />
                                    </motion.a>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div >
            </div>
        </div>
    );
};

