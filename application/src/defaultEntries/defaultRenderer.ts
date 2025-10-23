import { defineRenderHandler } from "nitro/runtime"

export default defineRenderHandler(async () => ({
	body: template,
	headers: {
		"content-type": "text/html",
	}
}))

const template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Immersive Experience</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            overflow-x: hidden;
            color: white;
            position: relative;
        }

        .bg-animation {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
            overflow: hidden;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            background-size: 400% 400%;
            animation: gradientShift 8s ease infinite;
        }

        @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        @keyframes float {
            0%, 100% { transform: translate(0, 0) scale(1); }
            25% { transform: translate(100px, -80px) scale(1.2); }
            50% { transform: translate(-60px, 60px) scale(0.8); }
            75% { transform: translate(80px, 100px) scale(1.1); }
        }

        .container {
            position: relative;
            z-index: 1;
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }

        header {
            text-align: center;
            animation: fadeInDown 1s ease-out;
        }

        h1 {
            font-size: 5rem;
            font-weight: 800;
            margin-bottom: 20px;
            background: linear-gradient(45deg, #fff, #f0f0f0);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            letter-spacing: -2px;
            animation: glow 3s ease-in-out infinite;
        }

        @keyframes glow {
            0%, 100% { text-shadow: 0 0 20px rgba(255,255,255,0.5); }
            50% { text-shadow: 0 0 40px rgba(255,255,255,0.8); }
        }

        .subtitle {
            font-size: 1rem;
            opacity: 0.9;
            margin-bottom: 60px;
            animation: fadeInUp 1s ease-out 0.3s backwards;
        }

        .cta-button {
            display: inline-block;
            padding: 20px 60px;
            background: linear-gradient(45deg, #926bff, #c45aee);
            color: white;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            font-size: 1.2rem;
            transition: all 0.3s ease;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            animation: pulse 2s infinite;
            margin-top: 20px;
        }

        .cta-button:hover {
            transform: scale(1.05);
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
        }

        @keyframes pulse {
            0%, 100% { box-shadow: 0 10px 30px rgba(255, 107, 107, 0.4); }
            50% { box-shadow: 0 10px 50px rgba(255, 107, 107, 0.7); }
        }

        @keyframes fadeInDown {
            from {
                opacity: 0;
                transform: translateY(-30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        footer {
            position: absolute;
            bottom: 40px;
            left: 0;
            right: 0;
            text-align: center;
            opacity: 0.7;
        }

        @media (max-width: 768px) {
            h1 { font-size: 3rem; }
            .subtitle { font-size: 1rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Welcome to Vono</h1>
            <a href="https://github.com/vonojs/framework" class="cta-button">View Documentation</a>
        </header>
    </div>
</body>
</html>`