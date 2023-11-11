import numpy as np
import psutil
import time

def print_memory_usage(message):
    print('-' * 80)
    print(message)
    # Get system memory information
    mem = psutil.virtual_memory()
    rss = psutil.Process().memory_info().rss
    # Print total and available memory in bytes
    print(f"Available memory: {mem.available / (1024 ** 3):2.2f} GiB")
    print(f"Resident memory: {rss / (1024 ** 3):2.2f} GiB")

if __name__ == "__main__":
    protcol = 5

    print_memory_usage(f"Pickling using protocol {protcol}")
    # Create a vector of 3 GiB with int8
    size = 3
    dtype = np.int8
    random_vector = np.random.randint(0, 127 , size=size * 1024 ** 3, dtype=dtype)
    size_in_GiB = random_vector.nbytes / (1024 ** 3)
    print(f"Size of random vector: {size_in_GiB:2.2f} GiB")
    print_memory_usage("After creating random vector")
    
    # Pickle the vector
    import pickle
    pickled_vector = pickle.dumps(random_vector, protocol=protcol)
    print_memory_usage("After pickling random vector")
    
    # Unpickle the vector
    unpickled_vector = pickle.loads(pickled_vector)
    print_memory_usage("After unpickling random vector")