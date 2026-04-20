# Fourier Transform Mixer & Properties Emphasizer

### Team 16 — Biomedical Signal Processing & AI Visualization Platform

---

## Full Application Demo

![Full Demo](frontend/public/docs/gifs/overview/full_demo.gif)

---

# Overview

This project is a web-based interactive platform for exploring **Fourier Transform concepts on 2D signals (images)** through two main modes:

- **FT Magnitude/Phase Mixer**
- **FT Properties Emphasizer**

The system is designed to explain the effect of **magnitude**, **phase**, **real**, and **imaginary** Fourier components, while also demonstrating how classical Fourier properties appear visually in both the **spatial** and **frequency** domains.

The application provides a modern user interface for image loading, Fourier component visualization, realtime mixing, region-based frequency selection, brightness/contrast adjustment, and interactive emphasis of important FT properties such as shifting, complex exponential multiplication, stretching, mirroring, even/odd construction, rotation, differentiation, integration, windowing, and repeated Fourier transforms.

---

# Main Features

## Part A — FT Magnitude / Phase Mixer

This mode focuses on mixing Fourier components from multiple input images and visualizing the reconstructed outputs.

### Key Capabilities

- Load and visualize **up to four input images**
- Unified image sizing with configurable resize policies
- For each image, display:
  - Original image
  - FT Magnitude
  - FT Phase
  - FT Real component
  - FT Imaginary component
- Display the result in one of **two output ports**
- Adjust **brightness/contrast** interactively
- Control weighted mixing using sliders
- Mix using:
  - Magnitude + Phase
  - Real + Imaginary
- Perform **region-based FT mixing**
- Choose **inner region** (low frequencies) or **outer region** (high frequencies)
- Highlight selected regions visually
- Support **realtime IFFT reconstruction**
- Cancel previous running operations when a new mixing request is made

---

## Part B — FT Properties Emphasizer

This mode demonstrates important Fourier Transform properties on images in an interactive way.

### Implemented / Demonstrated Properties

1. **Shift**
2. **Multiply by Complex Exponential**
3. **Stretch**
4. **Mirror**
5. **Even / Odd construction**
6. **Rotate**
7. **Differentiate**
8. **Integrate**
9. **Windowing**
10. **Repeated Fourier Transform**

### Key Capabilities

- Separate mode inside the same application
- Apply operations in the **spatial domain** or **frequency domain**
- Instantly observe the effect in the corresponding opposite domain
- Dual-domain visualization using:
  - Original spatial image
  - Transformed spatial image
  - Original FT
  - Transformed FT
- Switch displayed FT representation between:
  - Magnitude
  - Phase
  - Real
  - Imaginary

---

# Mixer Demonstrations

## Mixer Overview

### Mixer Workspace — Demo 1
![Mixer Overview 1](frontend/public/docs/gifs/mixer/mixer_overview_1.gif)

### Mixer Workspace — Demo 2
![Mixer Overview 2](frontend/public/docs/gifs/mixer/mixer_overview_2.gif)

These demos show the general image mixing workflow, including input image loading, Fourier inspection, and output generation.

---

## FT Component View
![FT Component View](frontend/public/docs/gifs/mixer/ft_component_view.gif)

This demo shows how each viewport can display different Fourier representations of the same image:
- **Magnitude** highlights frequency strength
- **Phase** preserves structural arrangement
- **Real** and **Imaginary** represent the complex FT components directly

---

## Region Mixer
![Region Mixer](frontend/public/docs/gifs/mixer/region_mixer.gif)

The region mixer allows the user to select a unified region on the Fourier plane and decide whether to include:
- the **inner region** for low-frequency contribution
- or the **outer region** for high-frequency contribution

This helps illustrate how coarse structure and fine details affect image reconstruction differently.

---

## Output Mixing Result
![Output Mixing Result](frontend/public/docs/gifs/mixer/output_mixing_result.gif)

This demo shows the final reconstructed result after changing component ratios and region selections across the four input images.

---

# Properties Emphasizer Demonstrations

## 1. Shift
![Shift Demo](frontend/public/docs/gifs/properties/shift.gif)

**Meaning:** shifting moves the image in space.  
**Effect in the Fourier domain:** a spatial shift preserves magnitude while changing phase.  
This demonstrates that **phase is strongly related to positional information**.

---

## 2. Multiply by Complex Exponential
![Complex Exponential Demo](frontend/public/docs/gifs/properties/complex_exp.gif)

**Meaning:** the image is multiplied by a configurable complex exponential term.  
**Effect in the Fourier domain:** this causes a controlled frequency-domain shift/modulation.  
This demonstrates the connection between **modulation in one domain** and **translation in the other**.

---

## 3. Stretch
![Stretch Demo](frontend/public/docs/gifs/properties/stretch.gif)

**Meaning:** stretching expands or compresses the image dimensions.  
**Effect in the Fourier domain:** stretching in one domain causes inverse scaling in the other domain.  
This illustrates the duality between **spatial size** and **frequency spread**.

---

## 4. Mirror
![Mirror Demo](frontend/public/docs/gifs/properties/mirror.gif)

**Meaning:** mirroring creates a reflected version of the image around an axis.  
**Effect in the Fourier domain:** the spectral representation changes according to the symmetry introduced into the image.  
This helps visualize how geometric symmetry affects FT structure.

---

## 5. Even / Odd Construction
![Even Odd Demo](frontend/public/docs/gifs/properties/even_odd.gif)

**Meaning:** the image is duplicated in a way that makes it globally even or odd around its center.  
**Effect in the Fourier domain:**  
- **even symmetry** emphasizes real-valued behavior  
- **odd symmetry** emphasizes imaginary-valued behavior  

This demonstrates the relationship between image symmetry and FT component structure.

---

## 6. Rotation
![Rotation Demo](frontend/public/docs/gifs/properties/rotate.gif)

**Meaning:** the image is rotated by a chosen angle.  
**Effect in the Fourier domain:** the Fourier representation rotates by the same angle.  
This is one of the clearest geometric FT properties.

---

## 7. Differentiate
![Differentiate Demo](frontend/public/docs/gifs/properties/differentiate.gif)

**Meaning:** differentiation emphasizes rapid changes and edges in the image.  
**Effect in the Fourier domain:** differentiation amplifies higher frequencies.  
This makes fine details and transitions more visually dominant.

---

## 8. Integrate
![Integrate Demo](frontend/public/docs/gifs/properties/integrate.gif)

**Meaning:** integration accumulates image values and smooths rapid variation.  
**Effect in the Fourier domain:** integration suppresses higher frequencies relative to lower ones.  
This makes the image appear more smoothed and less edge-dominant.

---

## 9. Windowing
**Demo will be added after final recording is uploaded.**

**Meaning:** a 2D window multiplies the image using a selected mask such as rectangular, Gaussian, Hamming, or Hanning.  
**Effect in the Fourier domain:** multiplication in one domain corresponds to convolution in the other.  
This property helps explain spectral shaping and leakage control.

---

## 10. Repeated Fourier Transform
**Demo will be added after final recording is uploaded.**

**Meaning:** the Fourier transform is applied repeatedly.  
**Effect in the Fourier domain:** repeated FT applications produce predictable transformations involving flips and returns to structured forms of the original image.  
This helps visualize one of the classic repeated-transform behaviors.

---

# Why Magnitude and Phase Matter

One of the central lessons of this project is that:

- **Magnitude** controls how strong different frequency components are
- **Phase** controls how those components align structurally in the image

In image reconstruction, phase often carries much of the structural information, while magnitude contributes strongly to intensity and frequency distribution.  
The mixer and properties modes together help illustrate these ideas visually and interactively.

---

# Suggested Workflow

A typical user can explore the application as follows:

1. Load up to four images in the mixer
2. Inspect each image in magnitude, phase, real, or imaginary representation
3. Select the desired output port
4. Control image contribution using weighted sliders
5. Choose inner or outer FT regions for mixing
6. Reconstruct the output and compare visual results
7. Switch to the properties emphasizer mode
8. Select a property such as shift, rotation, or differentiation
9. Apply the property in the spatial or frequency domain
10. Observe the direct corresponding change in the opposite domain

---

# Technologies Used

## Frontend
- Next.js / React
- JavaScript
- Interactive image and FT visualization UI

## Backend
- Python
- FastAPI
- Numerical image/Fourier processing utilities

## Core Concepts
- 2D Fourier Transform
- Inverse Fourier Transform
- Magnitude / Phase decomposition
- Real / Imaginary representation
- Frequency-region masking
- Spatial-frequency duality

---

# Project Structure

```text
ft-mixer-properties-emphasizer-dsp-task3/
├── backend/
├── frontend/
│   └── public/
│       └── docs/
│           ├── gifs/
│           │   ├── overview/
│           │   ├── mixer/
│           │   └── properties/
│           └── images/
├── .gitattributes
├── .gitignore
└── README.md
# Contributors <a name="contributors"></a>
<table align="center">
  <tr>
    <td align="center">
      <a href="https://github.com/hamdy-fathi" target="_blank">
        <img src="https://avatars.githubusercontent.com/u/183446123?v=4" width="100px;" alt="Hamdy Ahmed"/>
        <br />
        <sub><b>Hamdy Ahmed</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/OmegasHyper" target="_blank">
        <img src="https://avatars.githubusercontent.com/u/180775212?v=4" width="100px;" alt="Karim Mohamed"/>
        <br />
        <sub><b>Mohamed Abdelrazek</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/Chron1c-24" target="_blank">
        <img src="https://avatars.githubusercontent.com/u/143766084?v=4" width="100px;" alt="David Amir"/>
        <br />
        <sub><b>Yousef Samy</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/YomnaSabry172" target="_blank">
        <img src="https://avatars.githubusercontent.com/u/80396445?v=4" width="100px;" alt="Youmna Sabry"/>
        <br />
        <sub><b>Youmna Sabry</b></sub>
      </a>
    </td>
  </tr>
</table>
