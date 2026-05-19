<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# What is the html/json brain viewer acid from TRIBE V2? Where can we find it

The **HTML/JSON brain viewer** in TRIBE v2 is the **`nilearn.plotting.view_surf`-based interactive WebGL brain visualization** tool that comes packaged with the `tribev2[plotting]` extras. It renders predicted fMRI cortical activity as a self-contained HTML file (containing embedded JSON data and WebGL JavaScript) that you can open in any browser or embed as an iframe in a Jupyter notebook.[^1_1]

## What It Actually Is

When you call `view_surf()` from nilearn (used internally by TRIBE v2's plotting utilities), it produces a **~2.4 MB self-contained WebGL HTML artifact**. The "JSON" part refers to the brain mesh geometry and activation data encoded as JSON inside the HTML file.  The `get_iframe()` call wraps this in an `<iframe>` tag for side-by-side left/right hemisphere display in notebooks.  The output maps the predicted BOLD signal across 20,484 cortical vertices on the `fsaverage5` surface with a `hot` colormap on a black background.[^1_1]

You can also use TRIBE v2's native `PlotBrainNilearn` class, which provides more control:[^1_2]

```python
from tribev2.plotting.cortical import PlotBrainNilearn

plotter = PlotBrainNilearn(mesh="fsaverage5", inflate="half", bg_map="sulcal")
fig, axes = plotter.get_fig_axes(views=["left", "right"])
plotter.plot_surf(brain_data, axes=axes, cmap="hot", colorbar=True)
```


## Where to Find It

Here's where each piece lives:


| Resource | Link |
| :-- | :-- |
| **GitHub repo (main code)** | [github.com/facebookresearch/tribev2](https://github.com/facebookresearch/tribev2) [^1_3] |
| **HuggingFace model** | [huggingface.co/facebook/tribev2](https://huggingface.co/facebook/tribev2) [^1_4] |
| **Colab demo notebook** | `tribe_demo.ipynb` on GitHub / Google Colab [^1_5] |
| **Interactive Meta demo** | [aidemos.atmeta.com/tribev2](https://aidemos.atmeta.com/tribev2) [^1_6] |
| **DataCamp full tutorial** | [datacamp.com/tutorial/tribe-v2-tutorial](https://www.datacamp.com/tutorial/tribe-v2-tutorial) [^1_1] |

## Installation

Install the plotting extras to get the brain viewer:

```bash
pip install -e ".[plotting]"
# OR directly from GitHub:
pip install 'tribev2[plotting] @ git+https://github.com/facebookresearch/tribev2.git'
```

This pulls in `nilearn`, `pyvista`, and `plotly` as the rendering backends.  Note you'll also need an A100 GPU (≥40 GB VRAM) since the full trimodal pipeline loads LLaMA 3.2-3B + V-JEPA2-Giant + Wav2Vec-BERT 2.0 simultaneously.[^1_4][^1_1]
<span style="display:none">[^1_10][^1_11][^1_12][^1_13][^1_14][^1_15][^1_16][^1_17][^1_18][^1_19][^1_20][^1_21][^1_22][^1_23][^1_24][^1_25][^1_26][^1_7][^1_8][^1_9]</span>

<div align="center">⁂</div>

[^1_1]: https://www.datacamp.com/es/tutorial/tribe-v2-tutorial

[^1_2]: https://context7.com/facebookresearch/tribev2

[^1_3]: https://github.com/facebookresearch/tribev2

[^1_4]: https://huggingface.co/facebook/tribev2

[^1_5]: https://github.com/facebookresearch/tribev2/blob/main/tribe_demo.ipynb

[^1_6]: https://x.com/stephanedascoli/status/2037159637976318338

[^1_7]: https://arxiv.org/html/2507.22229v1

[^1_8]: https://ai.meta.com/blog/tribe-v2-brain-predictive-foundation-model/

[^1_9]: https://www.linkedin.com/posts/jean-rémi-king-690388247_introducing-tribe-v2-a-predictive-foundation-activity-7442924759048314880-0d8-

[^1_10]: https://www.facebook.com/AIatMeta/posts/today-were-introducing-tribe-v2-a-foundation-model-trained-to-predict-how-the-hu/1235934838705942/

[^1_11]: https://www.instagram.com/reel/DWbqdFuCSoW/

[^1_12]: https://www.instagram.com/reel/DWo0p2PDo3M/

[^1_13]: https://www.instagram.com/p/DNQXgvsNYbu/

[^1_14]: https://pasqualepillitteri.it/en/news/2474/meta-tribe-v2-ai-model-predicts-brain-activity-fmri

[^1_15]: https://www.datacamp.com/tutorial/tribe-v2-tutorial

[^1_16]: https://arxiv.org/html/2605.13904v1

[^1_17]: https://www.reddit.com/r/ArtificialInteligence/comments/1t7lyus/i_took_metas_tribe_v2_brain_model_and_made_it/

[^1_18]: https://www.linkedin.com/posts/aiatmeta_introducing-tribe-v2-a-predictive-foundation-activity-7442919649895239683-q6ez

[^1_19]: https://lib.rs/crates/tribev2

[^1_20]: https://github.com/amirmushichge/tribeV2_ViralAnalyser

[^1_21]: https://beta.pinokio.co/apps/github-com-facebookresearch-tribev2

[^1_22]: https://www.facebook.com/thanhhm/posts/metas-new-ai-can-now-predict-what-your-brain-thinks-its-called-tribe-v2it-takes-/10164729237323126/

[^1_23]: https://neurojson.org

[^1_24]: https://huggingface.co/api/resolve-cache/models/siddyviddy/neurallens-tribe-api/f8175da069da7e290f93e69de19103aca0c0f4a0/README.md?download=true\&etag="61e6a0bb4183d357bcf27697a34a8a225238cf24"

[^1_25]: https://community.brain-map.org/t/accessing-connectivity-streamline-data-the-sequel/2695

[^1_26]: https://brainbrowser.cbrain.mcgill.ca

