import mmap
import resource
import time 
import psutil 

import numpy as np


filename = "numpy_data.bin"

# Open the file in read-only mode
f = open(filename, mode="rb")

# Open a memory-map to the file 
mm = mmap.mmap(f.fileno(), length=0, access=mmap.ACCESS_READ)

# Check memory usage
mem_usage = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
mem_usage_MiB = mem_usage / 1024
print(f"Memory usage: {mem_usage_MiB:.2f} MiB")

process = psutil.Process()
memory = process.memory_info().rss
memory_MiB = memory / 1024**2
print(f"Memory usage ps-util: {memory_MiB:.2f} MiB")

# Wait a second
time.sleep(1)

# Create buffered array
mm_np = np.ndarray.__new__(np.ndarray, shape=(10**8,), dtype='float64', buffer=mm, order="C")

# Access 100 MiB of data from the memory-mapped array
size_of_element_bytes = mm_np.itemsize
number_of_elements = 100 * 1024 * 1024 // size_of_element_bytes
data = mm_np[:number_of_elements].copy()

# Use np.ndarray.__new__ to interpret the bytes
print(f"{data.nbytes / 1024**2:.2f} MiB")

# Check memory usage
mem_usage = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
mem_usage_MiB = mem_usage / 1024
print(f"Memory usage: {mem_usage_MiB:.2f} MiB")

process = psutil.Process()
memory = process.memory_info().rss
memory_MiB = memory / 1024**2
print(f"Memory usage ps-util: {memory_MiB:.2f} MiB")

# Add another memory spike
time.sleep(1)
data2 = data.copy()
time.sleep(0.5)

# Close memmap
mm.close()


# Erase data
time.sleep(2)

del data
del data2
time.sleep(0.25)
