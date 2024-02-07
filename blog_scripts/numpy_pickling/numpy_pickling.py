import numpy as np
import psutil
import time
import pickle


def print_memory_usage(message):
    print("-" * 80)
    print(message)
    # Get system memory information
    mem = psutil.virtual_memory()
    rss = psutil.Process().memory_info().rss
    # Print total and available memory in bytes
    # print(f"Available memory: {mem.available / (1024 ** 3):2.2f} GiB")
    print(f"Resident memory: {rss / (1024 ** 3):2.2f} GiB")


if __name__ == "__main__":
    
    protocol = 5

    print("-" * 80)
    print(f"Pickling using protocol {protocol}")
    print("-" * 80)

    print_memory_usage("Before creating numpy_array")
    # Create a vector of 3 GiB with a choosen dtype
    size_in_GiB = 3
    dtype = np.int16
    element_size = np.dtype(dtype).itemsize
    num_elements = int(size_in_GiB * (1024**3) / element_size)
    dimension = 1 
    print(num_elements)
    shape = tuple([int(np.power(num_elements, 1.0 / dimension)) for _ in range(dimension)] )
    print(shape)
    print('-----')
    numpy_array = np.full(shape=shape, fill_value=1, dtype=dtype)

    size_in_GiB = numpy_array.nbytes / (1024**3)
    print(f"Size of numpy_array: {size_in_GiB:2.2f} GiB")
    print_memory_usage("After creating numpy_array")
    time.sleep(10)

    # Pickle the vector
    start_time = time.time()
    pickled_vector = pickle.dumps(numpy_array, protocol=protocol)
    print_memory_usage("After pickling numpy_array")

    # Unpickle the vector
    unpickled_vector = pickle.loads(pickled_vector)
    end_time = time.time()
    print_memory_usage("After unpickling numpy_array")

    # Print the time taken to pickle and unpickle
    print(
        f"\n Time taken to pickle and unpickle protocol {protocol}: {end_time - start_time:2.2f} seconds \n"
    )

    del unpickled_vector
    del pickled_vector

    print_memory_usage("After deleting unpickled_vector and pickled_vector")
    time.sleep(10)

    protocol = 4

    print("-" * 80)
    print(f"Pickling using protocol {protocol}")
    print("-" * 80)

    # Pickle the vector
    start_time = time.time()
    pickled_vector = pickle.dumps(numpy_array, protocol=protocol)
    print_memory_usage("After pickling numpy_array")

    # Unpickle the vector
    unpickled_vector = pickle.loads(pickled_vector)
    end_time = time.time()
    print_memory_usage("After unpickling numpy_array")

    # Print the time taken to pickle and unpickle
    print(
        f"\n Time taken to pickle and unpickle protocol {protocol}: {end_time - start_time:2.2f} seconds \n"
    )

    del unpickled_vector
    del pickled_vector
    print_memory_usage("After deleting unpickled_vector and pickled_vector")
    time.sleep(10)

    ##################
    # Using out-of-band buffers
    ##################
    
    print("*" * 80)
    print(f"Using out of band objects")
    print("*" * 80)
    
    
    protocol = 5 # only works with protocol 5
    # Prepare a list to hold out-of-band buffers
    buffers = []

    # Pickle the array with protocol 5 and buffer callback
    start_time = time.time()
    pickled_vector = pickle.dumps(numpy_array, protocol=protocol, buffer_callback=buffers.append)
    print_memory_usage("After pickling numpy_array")

    # Unpickle the array, providing the out-of-band buffers
    unpickled_vector = pickle.loads(pickled_vector, buffers=buffers)
    end_time = time.time()
    print_memory_usage("After unpickling numpy_array")

    # Print the time taken to pickle and unpickle
    print(f"Time taken to pickle and unpickle: {end_time - start_time:.2f} seconds")
    
    del unpickled_vector
    del pickled_vector
    del numpy_array
    print_memory_usage("After deleting unpickled_vector and pickled_vector")
    
    time.sleep(10)
    ##################
    # Using non-contiguous objects
    ##################
    print("*" * 80)
    print(f"Using non-contiguous objects")
    print("*" * 80)
    
    print_memory_usage("before creating numpy_array")

    
    # Total desired size in bytes (3 GiB)
    total_size_in_bytes = 1 * 1024**3
    average_string_size = 50

    # Calculate the number of elements needed
    num_elements = total_size_in_bytes // average_string_size

    # Create an array of dtype 'object'
    numpy_array = np.empty(num_elements, dtype='object')

    # Fill the array with strings
    for i in range(num_elements):
        numpy_array[i] = 'a' * average_string_size  # Or any other string pattern
        
    size_in_GiB = numpy_array.nbytes / (1024**3)
    print(f"Size of numpy_array: {size_in_GiB:2.2f} GiB")
    print_memory_usage("After creating numpy_array")
    
    protcol = 5

    print("-" * 80)
    print(f"Pickling using protocol {protcol}")
    print("-" * 80)

    # Pickle the vector
    start_time = time.time()
    pickled_vector = pickle.dumps(numpy_array)
    print_memory_usage("After pickling numpy_array")

    # Unpickle the vector
    unpickled_vector = pickle.loads(pickled_vector)
    end_time = time.time()
    print_memory_usage("After unpickling numpy_array")

    # Print the time taken to pickle and unpickle
    print(
        f"\n Time taken to pickle and unpickle protcol {protcol}: {end_time - start_time:2.2f} seconds \n"
    )

    del unpickled_vector
    del pickled_vector

    print_memory_usage("After deleting unpickled_vector and pickled_vector")

    protcol = 4

    print("-" * 80)
    print(f"Pickling using protocol {protcol}")
    print("-" * 80)

    # Pickle the vector
    start_time = time.time()
    pickled_vector = pickle.dumps(numpy_array, protocol=protcol)
    print_memory_usage("After pickling numpy_array")

    # Unpickle the vector
    unpickled_vector = pickle.loads(pickled_vector)
    end_time = time.time()
    print_memory_usage("After unpickling numpy_array")

    # Print the time taken to pickle and unpickle
    print(
        f"\n Time taken to pickle and unpickle protcol {protcol}: {end_time - start_time:2.2f} seconds \n"
    )

    del unpickled_vector
    del pickled_vector
    print_memory_usage("After deleting unpickled_vector and pickled_vector")