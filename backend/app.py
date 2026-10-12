import os
import uvicorn
import gradio as gr
from api.main import app as fastapi_app

# Create a clean Gradio interface for the Hugging Face Space
with gr.Blocks(title="CardioViz3D Clinical AI Engine") as demo:
    gr.Markdown("# 🫀 CardioViz3D Clinical AI Engine")
    gr.Markdown("FastAPI Machine Learning Inference & SHAP Attribution Service is **Online & Ready**.")
    gr.Markdown("- **Interactive Swagger Docs:** [/docs](/docs)")
    gr.Markdown("- **Health Check:** [/health](/health)")

# Mount Gradio app on FastAPI root
app = gr.mount_gradio_app(fastapi_app, demo, path="/")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)

