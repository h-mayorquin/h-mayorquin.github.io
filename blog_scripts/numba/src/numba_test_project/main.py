from numba_module.heavy_computation import heavy_computation
import time

def main():
    n = 1000  # Large enough to make the computation heavy

    # First call - includes compilation time
    start_time = time.time()
    heavy_computation(n)
    first_call_duration = time.time() - start_time
    print(f"First call (with compilation): {first_call_duration:.2f} seconds")

    # Second call - should be faster
    start_time = time.time()
    heavy_computation(n)
    second_call_duration = time.time() - start_time
    print(f"Second call (compiled): {second_call_duration:.2f} seconds")

if __name__ == "__main__":
    main()