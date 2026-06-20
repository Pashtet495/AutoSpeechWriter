# AutoSpeechWriter
A program for transcribing speech to text. It uses the CrispASR backend for CPU and Vulkan and the Parakeet-TDT-0.6b-v3 model. It supports text recognition from files and the microphone. It supports automatic insertion of recognized text into active windows.

The app launches voice recognition from a file or streaming from a microphone. The program allows you to paste text within its interface or, when launched via hotkeys, into text input fields in any application.

- To build the project manually, upload the backend files to the crispasr-windows-x86_64-cpu and crispasr-windows-x86_64-vulkan directories. Upload ffmpeg to the ffmpeg directory. Add the parakeet-tdt-0.6b-v3-GGUF model to the models-cache directory.
- To install the required components and dependencies, run: install_deps.bat
- To run the project without building, run: start_dev.bat
- To build the project, run: build_exe.bat

  The app uses CrispASR backends (confirmed to work with version 0.71) and the neural network model https://huggingface.co/cstr/parakeet-tdt-0.6b-v3-GGUF/blob/main/parakeet-tdt-0.6b-v3-q4_k.gguf
  To work with other neural network models supported by CrispASR, you need to make changes to the neural network launch configuration settings and to the parser operating rules that receive the response from the backend.
