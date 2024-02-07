import numba
import numpy as np

def compilation_callback(event, *args):
    if event == 'numba:compile':
        print("Numba is compiling the function...")

numba.jit_event_callback = compilation_callback

@numba.jit(nopython=True)
def heavy_computation(n):
    a = np.random.rand(n, n)
    b = np.random.rand(n, n)
    result = np.dot(a, b)  # Matrix multiplication
    return result
