import numpy as np 
from pathlib import Path
import resource

# Create a large binary file filled with random data
filename = "numpy_data.bin"
num_elements = 10**8  # 100 million elements, about 800 MB for float64 data
data = np.arange(num_elements, dtype='float64')
data.tofile(filename)

# Check the size of the file
file_size = Path(filename).stat().st_size
file_size_MiB = file_size / 1024**2
print(f"File size: {file_size_MiB:.2f} MiB")

# Check the memory usage
mem_usage = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
mem_usage_MiB = mem_usage / 1024
print(f"Memory usage: {mem_usage_MiB:.2f} MiB")
